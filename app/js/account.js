(function() {
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

    //@Atrributes
    vm.form = {
      login: '',
      password: ''
    };

    function saveForm() {
      if(vm.form.login != '' && vm.form.password != '') {
        ipcRenderer.send('authentication-message', vm.form);
      }
    }

    ipcRenderer.on('asynchronous-reply', (event, arg) => {
      console.log(arg); // prints "pong"
    });

    ipcRenderer.on('authentication-failed', (event, arg) => {
      console.log(arg);
      vm.messageError = "La connexion a échouée";
      $scope.$apply();
    });
  }

})();
