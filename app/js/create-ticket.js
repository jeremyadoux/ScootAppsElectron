(function() {
    'use strict';

    angular
        .module('app', ['ui.select', 'ngSanitize'])
        .controller("createTicketCtrl", createTicketCtrl);

    createTicketCtrl.$inject = ['$scope', '$location', '$timeout', 'redmineService'];

    function createTicketCtrl($scope, $location, $timeout, redmineService) {
        const {ipcRenderer, desktopCapturer, remote} = require('electron');

        let urlRedmine = '';
        let dirnameElement = '';

        var vm = this;
        var started = false;
        var rect, line, isDown, origX, origY;
        var x = 0;
        var y = 0;

        var canvasFabric = new fabric.Canvas('canvas', {isDrawingMode: false});
        canvasFabric.observe('mouse:down', function(e) { mousedownCanvas(e); });
        canvasFabric.observe('mouse:move', function(e) { mousemoveCanvas(e); });
        canvasFabric.observe('mouse:up', function(e) { mouseupCanvas(e); });
        canvasFabric.observe('before:selection:cleared', function(e) { beforeSelectionClearedCanvas(e); });
        canvasFabric.observe('object:selected', function(e) { onObjecSelectedCanvas(e); });

        var canvas = document.getElementById("canvas");

        //Method
        vm.saveForm = saveForm;
        vm.currentScreenObj = currentScreenObj;
        vm.nextScreen = nextScreen;
        vm.previousScreen = previousScreen;
        vm.changeDrawingMode = changeDrawingMode;
        vm.goToCreateTicket = goToCreateTicket;
        vm.saveTicketFull = saveTicketFull;
        vm.clickedImage = clickedImage;
        vm.doubleClickedImage = doubleClickedImage;
        vm.removeSelectedFrabic = removeSelectedFrabic;
        vm.oneClickedImage = oneClickedImage;
        vm.noScreenGoTO = noScreenGoTO;
        vm.reloadScreen = reloadScreen;
        vm.messageToUSer = "";

        //Attributes
        vm.ready = false;
        vm.sources = [];
        vm.selectedSources = [];
        vm.step = 1;
        vm.currentScreen = 0;
        vm.drawingMode = "pointer";
        vm.objectMode = "pointer";

        vm.colorSelected = "#CE2A0B";
        vm.rect = {
            opacity: 0.2
        };
        vm.drawingPencil = {
            lineWidth:5
        };
        vm.errorMessage = "";

        //Ticket information
        vm.createTicket = {
            project: 705,
            tracker: 19,
            status: 1,
            priority: 4,
            title: "",
            description: "",
            email: ""
        };

        init();

        ipcRenderer.on('redmine-return-favorite', (event, arg) => {
            if(arg && typeof arg.project != 'undefined') {
                vm.createTicket.email = arg.email;
                $scope.$apply();
            }
        });

        ipcRenderer.send('redmine-get', {});

        function init() {
            desktopCapturer.getSources({ types:['window', 'screen'], thumbnailSize: {width: 1600, height: 1600} }, function(error, sources) {
                for (let source of sources) {
                    if(source.name != 'Charm Bar'
                    && source.name != 'Menu Démarrer'
                    && source.name != 'Volet de recherche'
                    && source.name != 'Date et heure'
                    && !source.name.match(/ScootApps/i)
                    && !source.name.match(/ScoutApps/i)) {
                        console.log(source);
                        vm.sources.push({
                            id: source.id,
                            name: source.name,
                            urlTH: source.thumbnail.toDataURL(),
                            urlTHModified: source.thumbnail.toDataURL(),
                            jsonModify: false,
                            clicked: false
                        });
                    }
                }

                vm.ready = true;
                $scope.$apply();
            });

            ipcRenderer.send('redmine-get-favorite', {});
        }

        function reloadScreen() {
            vm.sources = [];
            vm.selectedSources = [];
            init();
        }

        function saveForm() {
            vm.selectedSources = [];
            for (let source of vm.sources) {
                if(source.clicked) {
                    vm.selectedSources.push(source);
                }
            }
            vm.step = 2;
            initDrawing();
        }

        function clickedImage(img) {
            if(img.clicked) {
                img.clicked = false;
            } else {
                img.clicked = true;
            }
        }

        function doubleClickedImage(img) {
            img.clicked = true;
            vm.saveForm();
        }

        function oneClickedImage() {
            for(let index in vm.sources) {
                if(vm.sources[index].clicked) {
                    return true;
                }
            }

            return false;
        }

        function noScreenGoTO() {
            vm.selectedSources = [];
            vm.step = 3;
        }

        function currentScreenObj() {
            if(vm.selectedSources.length > 0) {
                return vm.selectedSources[vm.currentScreen];
            } else {
                return '';
            }
        }

        function nextScreen() {
            if(vm.currentScreen < (vm.selectedSources.length -1)) {
                vm.selectedSources[vm.currentScreen].urlTHModified = canvasFabric.toDataURL();
                vm.selectedSources[vm.currentScreen].jsonModify = canvasFabric.toJSON();
                vm.currentScreen++;
                initDrawing();
            }
        }

        function previousScreen() {
            if(vm.currentScreen > 0) {
                vm.selectedSources[vm.currentScreen].urlTHModified = canvasFabric.toDataURL();
                vm.selectedSources[vm.currentScreen].jsonModify = canvasFabric.toJSON();
                vm.currentScreen--;
                initDrawing();
            }
        }

        function initDrawing() {
            canvasFabric.clear();
            changeDrawingMode('pointer');
            let currentObj = currentScreenObj();
            if(currentObj.jsonModify) {
                canvasFabric.loadFromJSON(currentObj.jsonModify, canvasFabric.renderAll.bind(canvasFabric));
            } else {
                fabric.Image.fromURL(currentObj.urlTH, function(oImg) {
                    oImg.scaleToWidth(oImg.width*0.9);
                    oImg.scaleToHeight(oImg.height*0.9);

                    canvasFabric.setWidth(oImg.width*0.9);
                    canvasFabric.setHeight(oImg.height*0.9);
                    canvasFabric.setBackgroundImage(oImg, canvasFabric.renderAll.bind(canvasFabric));
                });
            }
        }

        function changeDrawingMode(mode) {
            vm.drawingMode = mode;
            vm.objectMode = mode;
            if(mode == "pencil") {
                canvasFabric.isDrawingMode = true;
                canvasFabric.freeDrawingBrush = new fabric['PencilBrush'](canvasFabric);
                canvasFabric.freeDrawingBrush.color = vm.colorSelected;
                canvasFabric.freeDrawingBrush.width = parseInt(vm.drawingPencil.lineWidth, 10) || 1;
            } else {
                canvasFabric.isDrawingMode = false;
            }
            if(mode != 'pointer') {
                canvasFabric.selection = false;
            } else {
                canvasFabric.selection = true;
            }


        }

        function mousedownCanvas(o) {
            if(!canvasFabric.getActiveObject()) {
                if (vm.drawingMode == "square") {
                    isDown = true;
                    var pointer = canvasFabric.getPointer(o.e);
                    origX = pointer.x;
                    origY = pointer.y;
                    var pointer = canvasFabric.getPointer(o.e);
                    let rgb = hexToRgb(vm.colorSelected);

                    rect = new fabric.Rect({
                        left: origX,
                        top: origY,
                        originX: 'left',
                        originY: 'top',
                        width: pointer.x - origX,
                        height: pointer.y - origY,
                        angle: 0,
                        fill: 'rgba('+rgb.r+','+rgb.g+','+rgb.b+','+vm.rect.opacity+')',
                        opacity: 1,
                        stroke: vm.colorSelected,
                        strokeWidth: 1,
                        transparentCorners: false
                    });
                    canvasFabric.add(rect);
                }
                if(vm.drawingMode == "text") {
                    var pointer = canvasFabric.getPointer(o.e);
                    origX = pointer.x;
                    origY = pointer.y;
                    var pointer = canvasFabric.getPointer(o.e);
                    let fabricText = new fabric.IText('', {
                        fontFamily: 'arial black',
                        left: origX,
                        top: origY,
                        originX: 'left',
                        originY: 'top',
                        fill: vm.colorSelected,
                    });
                    canvasFabric.add(fabricText);

                    changeDrawingMode("pointer");

                    canvasFabric.setActiveObject(fabricText);
                    fabricText.enterEditing();
                    fabricText.hiddenTextarea.focus();


                    $scope.$apply();
                }
                if(vm.drawingMode == "arrow") {
                    isDown = true;
                    var pointer = canvasFabric.getPointer(o.e);
                    var points = [ pointer.x, pointer.y, pointer.x, pointer.y ];





                    line = new fabric.Line(points, {
                        strokeWidth: 5,
                        fill: vm.colorSelected,
                        stroke: vm.colorSelected,
                        originX: 'center',
                        originY: 'center'
                    });
                    canvasFabric.add(line);
                }
            }
        }

        function mousemoveCanvas(o) {
            if (!isDown) return;
            if(vm.drawingMode == "square") {
                var pointer = canvasFabric.getPointer(o.e);

                if (origX > pointer.x) {
                    rect.set({left: Math.abs(pointer.x)});
                }
                if (origY > pointer.y) {
                    rect.set({top: Math.abs(pointer.y)});
                }

                rect.set({width: Math.abs(origX - pointer.x)});
                rect.set({height: Math.abs(origY - pointer.y)});

                canvasFabric.renderAll();
            }
            if(vm.drawingMode == "arrow") {
                var pointer = canvasFabric.getPointer(o.e);
                line.set({ x2: pointer.x, y2: pointer.y });
                canvasFabric.renderAll();
            }
            $scope.$apply();
        }

        function mouseupCanvas(o) {
            isDown = false;
            if(vm.drawingMode == "square") {
                rect.setCoords();
            }
            if(vm.drawingMode == "arrow") {
                changeDrawingMode('pointer');
                line.setCoords();
                canvasFabric.setActiveObject(line);
            }
            $scope.$apply();
        }

        function beforeSelectionClearedCanvas(e) {
            let clearedObject = canvasFabric.getActiveObject();
            if(typeof(clearedObject) !== 'undefined' && clearedObject != null) {
                if(clearedObject.get('type') == 'i-text') {
                    if(clearedObject.getText() == '') {
                        canvasFabric.remove(clearedObject);
                    }
                }
                if(vm.drawingMode == 'pointer') {
                    vm.objectMode = 'pointer';
                }
                if ($scope.$root.$$phase != '$apply' && $scope.$root.$$phase != '$digest') {
                    $scope.$apply();
                }
            }
        }

        function onObjecSelectedCanvas(e) {
            let selectedObject = canvasFabric.getActiveObject();
            if(typeof(selectedObject) !== 'undefined' && selectedObject != null) {
                let type = selectedObject.get('type');
                if(type == 'rect') {
                    vm.objectMode = 'square';

                    let colorResult = rgbToHex(selectedObject.fill);
                    vm.colorSelected = colorResult.hex;
                    vm.rect.opacity = colorResult.opacity;
                }

                if(type == 'i-text') {
                    vm.objectMode = 'text';
                    vm.colorSelected = selectedObject.fill;
                }

                if(type == 'path') {
                    vm.objectMode = 'pencil';
                    vm.colorSelected = selectedObject.stroke;
                    vm.drawingPencil.lineWidth = 5;
                }

                $scope.$apply();
            }


        }

        function changedColorSelection(color) {
            if(canvasFabric.getActiveObject()) {
                let type = canvasFabric.getActiveObject().get('type');
                if(type == 'rect') {
                    let rgb = hexToRgb(vm.colorSelected);
                    canvasFabric.getActiveObject().fill = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+','+vm.rect.opacity+')';
                    canvasFabric.getActiveObject().stroke = vm.colorSelected;
                }

                if(type == 'i-text') {
                    canvasFabric.getActiveObject().fill = vm.colorSelected;
                }

                if(type == 'path') {
                    canvasFabric.getActiveObject().stroke = vm.colorSelected;
                }

                canvasFabric.renderAll();
            } else {
                if(canvasFabric.freeDrawingBrush) {
                    canvasFabric.freeDrawingBrush.color = vm.colorSelected;
                    canvasFabric.freeDrawingBrush.width = parseInt(vm.drawingPencil.lineWidth, 10) || 1;
                }
            }
        }

        function changedRectOpacity() {
            if(canvasFabric.getActiveObject()) {
                let type = canvasFabric.getActiveObject().get('type');

                if(type == 'rect') {
                    let rgb = hexToRgb(vm.colorSelected);
                    canvasFabric.getActiveObject().fill = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+','+vm.rect.opacity+')';
                    canvasFabric.getActiveObject().stroke = vm.colorSelected;
                }

                canvasFabric.renderAll();
            }
        }

        function changedDrawingPencilLineWidthSelection() {
            if(canvasFabric.getActiveObject()) {
                let type = canvasFabric.getActiveObject().get('type');

                if(type == 'path') {
                    canvasFabric.getActiveObject().strokeWidth = parseInt(vm.drawingPencil.lineWidth, 10) || 1;
                    canvasFabric.renderAll();
                }
            }
            if (canvasFabric.freeDrawingBrush) {
                canvasFabric.freeDrawingBrush.color = vm.colorSelected;
                canvasFabric.freeDrawingBrush.width = parseInt(vm.drawingPencil.lineWidth, 10) || 1;
            }
        }

        function removeSelectedFrabic() {
            if(canvasFabric.getActiveObject()) {
                canvasFabric.remove(canvasFabric.getActiveObject());
            }
        }

        function goToCreateTicket() {
            vm.selectedSources[vm.currentScreen].urlTHModified = canvasFabric.toDataURL();
            vm.selectedSources[vm.currentScreen].jsonModify = canvasFabric.toJSON();
            vm.step = 3;
        }


        function saveTicketFull() {
            vm.errorMessage = "";


            if(typeof vm.createTicket.email == "undefined" || vm.createTicket.email == '') {
                vm.errorMessage = vm.errorMessage + "Vous devez saisir votre email pour que nous puissions vous recontacter <br />";
            }

            if(vm.createTicket.title == '') {
                vm.errorMessage = vm.errorMessage + "Vous devez ajouter un titre <br />";
            }

            if(vm.createTicket.description == '') {
                vm.errorMessage = vm.errorMessage + "Vous devez ajouter une description <br />";
            }

            if(vm.errorMessage == "") {
                vm.messageToUSer = "Votre ticket est en cours de sauvegarde";

                new Promise(function(resolve, reject) {
                    if(vm.selectedSources.length > 0) {
                        redmineService.uploadAttachments(vm.selectedSources).then(function (response) {
                           resolve(response);
                        });
                    } else {
                        resolve([]);
                    }
                }).then(function(response) {
                    vm.createTicket.uploads = [];
                    if(response.length > 0) {
                        for (let i = 0; i < response.length; i++) {
                            vm.createTicket.uploads.push({
                                token: response[i],
                                filename: "image" + i + ".png",
                                content_type: "image/png"
                            });
                        }
                    }



                    redmineService.createTicket(vm.createTicket).then(function () {
                        ipcRenderer.send('redmine-save-favorite', vm.createTicket);
                        vm.messageToUSer = "Merci, votre ticket a été sauvegardé.";
                        $timeout(function () { ipcRenderer.send('reload-windows', {})}, 1500);
                    });
                });
            }
        }

        function hexToRgb(hex) {
            let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }

        function componentToHex(c) {
            let hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }

        function rgbToHex(rgba) {
            let regex = /\((.*)\)/g;
            let resultFirst = regex.exec(rgba);
            let resultExploded = resultFirst[1].split(",");
            console.log(resultExploded);

            let rgb = rgba.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
            let hexa = (rgb && rgb.length === 4) ? "#" +
            ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
            ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
            ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';


            let result = {
                hex: hexa,
                opacity: resultExploded[3]
            };
            return result;
        }

        $scope.$watch(function () {
            return vm.colorSelected;
        }, changedColorSelection);

        $scope.$watch(function () {
            return vm.drawingPencil.lineWidth;
        }, changedDrawingPencilLineWidthSelection);

        $scope.$watch(function () {
            return vm.rect.opacity;
        }, changedRectOpacity);
    }
})();
