(function() {
  'use strict';

  angular
      .module('app', [])
      .controller("favoriteCtrl", favoriteCtrl);

  favoriteCtrl.$inject = ['$scope'];

  function favoriteCtrl($scope) {
    const {ipcRenderer} = require('electron');
    var vm = this;

    //@Method
    vm.saveFavorite = saveFavorite;

    //@Variable
    vm.groups = [];

    ipcRenderer.send('load-group-list', null);

    //ipcRenderer.send('test-ail-list', null);

    ipcRenderer.on('plop', (event, arg) => {
      console.log(arg);
    });

    ipcRenderer.on('group-list-loaded', (event, arg) => {
      vm.groups = arg;
      vm.groups.sort(function(a,b) {
         if(a.label < b.label) {
           return -1;
         } else if(a.label > b.label) {
           return 1;
         }

         return 0;
      });
      $scope.$apply();
    });

    function saveFavorite() {
      ipcRenderer.send('save-group-favorite', vm.groups);
    }
  }
})();
