(function () {
    'use strict';

    angular
        .module('app', [])
        .controller("accountCtrl", accountCtrl);

    accountCtrl.$inject = ['$scope'];

    function accountCtrl($scope) {
        const {ipcRenderer} = require('electron');
        var vm = this;

        //@Method
        vm.saveForm = saveForm;
        vm.saveRedmineForm = saveRedmineForm;

        //@Atrributes
        vm.form = {
            login: '',
            password: ''
        };

        vm.redmine = {
            apikey: '',
            url: ''
        };

        function saveForm() {
            if (vm.form.login != '' && vm.form.password != '') {
                ipcRenderer.send('authentication-message', vm.form);
            }
        }

        function saveRedmineForm() {
            ipcRenderer.send('redmine-save', vm.redmine);
        }

        ipcRenderer.on('asynchronous-reply', (event, arg) => {
            console.log(arg); // prints "pong"
        });

        ipcRenderer.on('redmine-return', (event, arg) => {
            vm.redmine = arg;
            $scope.$apply();
        });

        ipcRenderer.on('authentication-failed', (event, arg) => {
            console.log(arg);
            vm.messageError = "La connexion a échouée";
            $scope.$apply();
        });

        ipcRenderer.send('redmine-get', {});
    }

})();
