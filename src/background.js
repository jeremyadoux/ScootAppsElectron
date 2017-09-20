
import { app, ipcMain, BrowserWindow } from 'electron';

import env from './env';

let storage = require('electron-json-storage');
let winCreateTicket = null;


app.on('ready', () => {
    openWindowsCreateTicket();
});


ipcMain.on('redmine-save-favorite', (event, arg) => {
    storage.set(env.redmineFavorite, arg, (error) => {
        if (error) throw error;
    });
});

ipcMain.on('redmine-get-favorite', (event, arg) => {
    storage.get(env.redmineFavorite, (error, redmineFavorite) => {
        event.sender.send('redmine-return-favorite', redmineFavorite);
    });
});

ipcMain.on('reload-windows', (event, arg) => {
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
        winCreateTicket = new BrowserWindow({width: 1680, height: 960, icon:  __dirname + '/images/scout.ico'});

        // and load the index.html of the app.
        winCreateTicket.openDevTools();
        winCreateTicket.loadURL(`file://${__dirname}/templates/ticket-index.html`);
        winCreateTicket.maximize();
    }
}
