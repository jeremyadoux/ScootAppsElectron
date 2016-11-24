(function() {
    'use strict';

    angular
        .module('app', [])
        .controller("createTicketCtrl", createTicketCtrl);

    createTicketCtrl.$inject = ['$scope'];

    function createTicketCtrl($scope) {
        const {ipcRenderer, desktopCapturer} = require('electron');

        var vm = this;
        var started = false;
        var rect, isDown, origX, origY;
        var x = 0;
        var y = 0;

        var canvasFabric = new fabric.Canvas('canvas', {isDrawingMode: false});
        canvasFabric.observe('mouse:down', function(e) { mousedownCanvas(e); });
        canvasFabric.observe('mouse:move', function(e) { mousemoveCanvas(e); });
        canvasFabric.observe('mouse:up', function(e) { mouseupCanvas(e); });

        var canvas = document.getElementById("canvas");

        //Method
        vm.saveForm = saveForm;
        vm.currentScreenURL = currentScreenURL;
        vm.nextScreen = nextScreen;
        vm.previousScreen = previousScreen;
        vm.drawingPencil = drawingPencil;

        //Attributes
        vm.sources = [];
        vm.selectedSources = [];
        vm.step = 1;
        vm.currentScreen = 0;

        init();

        function init() {
            desktopCapturer.getSources({ types:['window', 'screen'], thumbnailSize: {width: 1600, height: 1600} }, function(error, sources) {
                for (let source of sources) {
                    vm.sources.push({
                        id: source.id,
                        name: source.name,
                        urlTH: source.thumbnail.toDataURL(),
                        urlTHModify: source.thumbnail.toDataURL(),
                        added: false
                    });
                }

                $scope.$apply();
            });
        }

        function saveForm() {
            for (let source of vm.sources) {
                if(source.added) {
                    vm.selectedSources.push(source);
                }
            }
            vm.step = 2;
            initDrawing();
        }

        function currentScreenURL() {
            if(vm.selectedSources.length > 0) {
                return vm.selectedSources[vm.currentScreen].urlTHModify;
            } else {
                return '';
            }
        }

        function nextScreen() {
            if(vm.currentScreen < (vm.selectedSources.length -1)) {
                vm.selectedSources[vm.currentScreen].urlTHModify = canvas.toDataURL();
                vm.currentScreen++;
                initDrawing();
            }
        }

        function previousScreen() {
            if(vm.currentScreen > 0) {
                vm.selectedSources[vm.currentScreen].urlTHModify = canvas.toDataURL();
                vm.currentScreen--;
                initDrawing();
            }
        }

        function initDrawing() {
            fabric.Image.fromURL(currentScreenURL(), function(oImg) {
                canvasFabric.setWidth(oImg.width);
                canvasFabric.setHeight(oImg.height);
                //oImg.evented = false;
                //canvasFabric.add(oImg);
                canvasFabric.setBackgroundImage(oImg, canvasFabric.renderAll.bind(canvasFabric));
                canvasFabric.freeDrawingBrush = new fabric['PencilBrush'](canvasFabric);
                canvasFabric.freeDrawingBrush.color = "#2B2323";
                canvasFabric.freeDrawingBrush.width = 1;

            });
        }

        function drawingReinit() {
            canvasFabric.isDrawingMode = false;
        }

        function drawingPencil() {
            drawingReinit();
            canvasFabric.isDrawingMode = true;
        }

        function mousedownCanvas(o) {
            if(canvasFabric.getActiveObject()){
                return false;
            }

            isDown = true;
            var pointer = canvasFabric.getPointer(o.e);
            origX = pointer.x;
            origY = pointer.y;
            pointer = canvasFabric.getPointer(o.e);
            rect = new fabric.Rect({
                left: origX,
                top: origY,
                originX: 'left',
                originY: 'top',
                width: pointer.x-origX,
                height: pointer.y-origY,
                fill: 'rgba(255,0,0,0.5)',
                opacity: 0.4
            });
            canvasFabric.add(rect);
            canvasFabric.setActiveObject(rect);
        }

        function mousemoveCanvas(o) {
            if(!isDown) {
                return false;
            }

            var pointer = canvasFabric.getPointer(o.e);
            var rect = canvasFabric.getActiveObject();

            if(origX>pointer.x){
                rect.set({ left: Math.abs(pointer.x) });
            }
            if(origY>pointer.y){
                rect.set({ top: Math.abs(pointer.y) });
            }

            rect.set({ width: Math.abs(origX - pointer.x) });
            rect.set({ height: Math.abs(origY - pointer.y) });
        }

        function mouseupCanvas(o) {
            if(isDown) {
                isDown = false;
            }

            var rect = canvasFabric.getActiveObject();

            canvasFabric.add(rect);
        }
    }
})();
