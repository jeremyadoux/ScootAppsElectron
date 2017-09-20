(function () {'use strict';

    function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

    var electron = require('electron');
    var promise = _interopDefault(require('promise'));
    var http = _interopDefault(require('http'));
    var storage = _interopDefault(require('electron-json-storage'));
    var jetpack = _interopDefault(require('fs-jetpack'));
    var Toaster = _interopDefault(require('electron-toaster'));

// Simple wrapper exposing environment variables to rest of the code.

// The variables have been written to `env.json` by the build process.
    var env = jetpack.cwd(__dirname).read('env.json', 'json');

    const xml2js = require('xml2js');

    let toaster = new Toaster();
    var winCreateTicket = null;


    electron.app.on('ready', () => {
        openWindowsCreateTicket();
    });

    electron.app.on('will-quit', () => {
        // Unregister all shortcuts.
        electron.globalShortcut.unregisterAll();
    });


    electron.ipcMain.on('redmine-save-favorite', (event, arg) => {
        storage.set(env.redmineFavorite, arg, (error) => {
            if (error) throw error;
        });
    });

    electron.ipcMain.on('redmine-get-favorite', (event, arg) => {
        storage.get(env.redmineFavorite, (error, redmineFavorite) => {
            event.sender.send('redmine-return-favorite', redmineFavorite);
        });
    });

    electron.ipcMain.on('reload-windows', (event, arg) => {
        if(winCreateTicket != null) {
            winCreateTicket.show();
            winCreateTicket.loadURL(`file://${__dirname}/templates/ticket-index.html`);
        }
    });

    function openWindowsCreateTicket() {
        if(winCreateTicket != null) {
            winCreateTicket.show();
            winCreateTicket.loadURL(`file://${__dirname}/templates/ticket-index.html`);
        } else {
            // Create the browser window.
            winCreateTicket = new electron.BrowserWindow({width: 1680, height: 960, icon:  __dirname + '/images/scout.ico'});

            toaster.init(winCreateTicket);

            // and load the index.html of the app.
            winCreateTicket.openDevTools();
            winCreateTicket.loadURL(`file://${__dirname}/templates/ticket-index.html`);
            winCreateTicket.maximize();
        }
    }
}());
//# sourceMappingURL=background.js.map
