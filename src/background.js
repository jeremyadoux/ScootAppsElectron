import {app, BrowserWindow, Menu, Tray, MenuItem, shell, ipcMain, clipboard, dialog } from 'electron';
import promise from 'promise';
import webservicesVdoc from './helpers/webservices';
import storage from 'electron-json-storage';
import env from './env';
import AutoLaunch from 'auto-launch';

var winAccount = null;
var winFavorite = null;
var winCreateTicket = null;
var login = null;
var tray = null;
var WS = null;

var scootAppsAutoLauncher = new AutoLaunch({
    name: 'ScootApps'
});

app.on('ready', () => {
    scootAppsAutoLauncher.isEnabled()
        .then(function(isEnabled){
            if(isEnabled){
                return;
            }
            scootAppsAutoLauncher.enable();
        })
        .catch(function(err){
            // handle error
        });

    WS = webservicesVdoc("vdoc-prod.vdocsuite.com");
    createTray();
    executeIntroduction().then( function() {});
});

ipcMain.on('authentication-message', (event, arg) => {
    WS.setAuthentication(arg.login, arg.password).then(function() {
        login = arg.login;
        createTray();
        winAccount.hide();
        openWindowFavorite();
    }, function(e) {
        event.sender.send('authentication-failed', e);
    });
});

ipcMain.on('load-group-list', (event, arg) => {
    WS.getListGroup().then(function(groupList) {
        storage.get(env.storageFavoriteGroup, (error, groupListFavorite) => {
            if(groupListFavorite.length > 0) {
                groupListFavorite.forEach(function (Favorite) {
                    groupList.forEach(function (Group) {
                        if (Group.id == Favorite.id) {
                            Group.favorite = Favorite.favorite;
                        }
                    });
                });
            }
            event.sender.send('group-list-loaded', groupList);
        });
    }, function(e){
        event.sender.send('plop', e);
        if(e.code == 201) {
            openWindowAccount();
        }
    });
});

ipcMain.on('save-group-favorite', (event, arg) => {
    console.log(app.getPath('userData'));
    storage.set(env.storageFavoriteGroup, arg, (error) => {
        if (error) throw error;
        createTray();
        winFavorite.hide();
    });
});

function openWindowAccount () {
    if(winAccount != null) {
        winAccount.show();
    } else {
        // Create the browser window.
        winAccount = new BrowserWindow({width: 800, height: 600});
        // and load the index.html of the app.
        winAccount.loadURL(`file://${__dirname}/account.html`);
        //winAccount.openDevTools();
        // Emitted when the window is closed.
        winAccount.on('close', (e) => {
            e.preventDefault();
            winAccount.hide();
        });
    }
}

function openWindowFavorite () {
    if(winFavorite != null) {
        winFavorite.show();
    } else {
        // Create the browser window.
        winFavorite = new BrowserWindow({width: 800, height: 600});
        // and load the index.html of the app.
        winFavorite.loadURL(`file://${__dirname}/favorite.html`);
        //winFavorite.openDevTools();
        // Emitted when the window is closed.
        winFavorite.on('close', (e) => {
            e.preventDefault();
            winFavorite.hide();
        });
    }
}

function openWindowsCreateTicket() {
    if(winCreateTicket != null) {
        winCreateTicket.show();
    } else {
        // Create the browser window.
        winCreateTicket = new BrowserWindow({width: 800, height: 600});
        // and load the index.html of the app.
        winCreateTicket.loadURL(`file://${__dirname}/templates/create-ticket.html`);
        winCreateTicket.openDevTools();
        // Emitted when the window is closed.
        winCreateTicket.on('close', (e) => {
            e.preventDefault();
            winCreateTicket.hide();
        });
    }
}

function createTray() {
    if(tray != null) {
        tray.destroy();
        tray = null;
    }

    storage.get(env.storageFavoriteGroup, (error, groupList) => {
        tray = new Tray(__dirname + '\\images\\scout.ico');

        const menu = new Menu();

        if(groupList.length > 0) {
            groupList.sort(function(a,b) {
                if(a.label < b.label) {
                    return -1;
                } else if(a.label > b.label) {
                    return 1;
                }

                return 0;
            });
            Array.from(groupList).forEach(function (group) {
                if (group.favorite) {
                    menu.append(new MenuItem({
                        label: group.label, click(menuItem, browserWindows, event) {
                            //menuItem.commandId
                            WS.getListMail(group.id).then(function (mailList) {
                                var re = new RegExp(login, 'g');
                                for(var key in mailList) {
                                    if(mailList[key].match(re)) {
                                        mailList.splice(key, 1);
                                    }
                                }

                                if (event.ctrlKey) {
                                    clipboard.writeText(mailList.join(";"));
                                } else {
                                    shell.openExternal("mailto:" + mailList.join(";"));
                                }
                            }, function (e) {

                            });
                        }
                    }))
                }
            });
        }

        menu.append(new MenuItem({type: 'separator'}));

        menu.append(new MenuItem({label: "Compte", click() {
            openWindowAccount();
        }}));

        menu.append(new MenuItem({label: "Favoris", click() {
            openWindowFavorite();
        }}));

        menu.append(new MenuItem({label: "Créer un ticket", click() {
            openWindowsCreateTicket();
        }}));

        menu.append(new MenuItem({type: 'separator'}));

        menu.append(new MenuItem({label: "Quit", click() {
            if(winFavorite != null) {
                winFavorite.removeAllListeners('close');
                winFavorite.close();
            }

            if(winAccount != null) {
                winAccount.removeAllListeners('close');
                winAccount.close();
            }

            if(winCreateTicket != null) {
                winCreateTicket.removeAllListeners('close');
                winCreateTicket.close();
            }
            app.quit()
        }}));

        tray.setToolTip('ScoutApps');
        tray.setContextMenu(menu);
    });
}

function executeIntroduction() {
    return new promise((resolve, reject) => {
        storage.get(env.storageAccountPassword, (error, data) => {
            if (error) throw error;
            if (typeof data.login != 'undefined' && data.password != 'undefined') {
                login = data.login;
                WS.setAuthentication(data.login, data.password).then(function() {
                    resolve();
                }, function(e) {
                    openWindowAccount();
                    reject(e);
                });
            } else {
                openWindowAccount();
                reject()
            }
        });
    });
}
