(function() {
    'use strict';

    angular
        .module('app', ['ui.select', 'ngSanitize', 'ui.bootstrap'])
        .controller("createTicketCtrl", createTicketCtrl)
        .controller("ModalInstanceCtrl", ModalInstanceCtrl);

    createTicketCtrl.$inject = ['$scope', '$uibModal', 'redmineService'];

    function createTicketCtrl($scope, $uibModal, redmineService) {
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
        vm.loadParentUS = loadParentUS;
        vm.clickedImage = clickedImage;
        vm.doubleClickedImage = doubleClickedImage;
        vm.removeSelectedFrabic = removeSelectedFrabic;
        vm.razTicket = razTicket;
        vm.removeUSParent = removeUSParent;
        vm.oneClickedImage = oneClickedImage;
        vm.resetCreateTicket = resetCreateTicket;
        vm.noScreenGoTO = noScreenGoTO;

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

        vm.imageCCho = [
            {name: 'burger', img: './images/ccho/burger.png'},
            {name: 'ccho', img: './images/ccho/ccho.png'},
            {name: 'gerable', img: './images/ccho/gerable.png'},
            {name: 'grave', img: './images/ccho/grave.png'},
            {name: 'jvoispas', img: './images/ccho/jvoispas.png'},
            {name: 'michel', img: './images/ccho/michel.png'},
            {name: 'schlaff', img: './images/ccho/schlaff.png'},
            {name: 'serieux', img: './images/ccho/serieux.png'}
        ];

        vm.selectedCCHO = '';

        //Ticket information
        vm.createTicket = {
            project: "",
            tracker: "",
            status: "",
            version: "",
            priority: "",
            title: "",
            description: "",
            category: "",
            assignedTo: "",
            parent_issue_id: 0,
            reopen: false
        };
        vm.dataSelect = {
            projects: [],
            categories: [],
            tracker: [],
            status: [],
            version: [],
            priorities: [],
            parentIssue: [],
            memberships: []
        };


        function razTicket() {
            vm.createTicket = {
                project: "",
                tracker: "",
                status: "",
                version: "",
                category: "",
                priority: "",
                title: "",
                description: "",
                assignedTo: "",
                parent_issue_id: 0,
                reopen: false
            };
        }

        function removeUSParent() {
            vm.createTicket.parent_issue_id = 0;
        }

        ipcRenderer.on('redmine-return', (event, arg) => {
            urlRedmine =  arg.url;
            dirnameElement = arg.dirname;
            redmineService.setApiKey(arg.apikey, arg.url);
            init();
            ipcRenderer.send('redmine-get-favorite', {});
        });

        ipcRenderer.on('redmine-return-favorite', (event, arg) => {
            if(arg && typeof arg.project != 'undefined') {
                vm.createTicket.project = arg.project;
                vm.createTicket.tracker = arg.tracker;
                vm.createTicket.status = arg.status;
                vm.createTicket.version = arg.version;
                vm.createTicket.category = arg.category;
                vm.createTicket.priority = arg.priority;
                vm.createTicket.parent_issue_id = arg.parent_issue_id;

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
            redmineService.favoriteProject().then(function (results) {
                vm.dataSelect.projects = results;
            });
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

            if(mode == 'ccho') {
                var modalInstance = $uibModal.open({
                    animation: true,
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    template: '<div class="modal-header">\n' +
                    '            <h3 class="modal-title" id="modal-title">La michel BOX!</h3>\n' +
                    '        </div>\n' +
                    '        <div class="ccho modal-body" id="modal-body">\n' +
                    '            <ul>\n' +
                    '                <li ng-repeat="item in $ctrl.items">\n' +
                    '                    <a href="#" ng-click="$event.preventDefault(); $ctrl.selected.item = item"><img class="resize-mini-ccho" ng-class="{minicchoselected : item == $ctrl.selected.item}" ng-src="{{item.img}}" alt="" /></a>\n' +
                    '                </li>\n' +
                    '            </ul>\n' +
                    '        </div>\n' +
                    '        <div class="modal-footer">\n' +
                    '            <button class="btn btn-primary" type="button" ng-click="$ctrl.ok()">OK</button>\n' +
                    '            <button class="btn btn-warning" type="button" ng-click="$ctrl.cancel()">Cancel</button>\n' +
                    '        </div>',
                    controller: 'ModalInstanceCtrl',
                    controllerAs: '$ctrl',
                    resolve: {
                        items: function () {
                            return vm.imageCCho;
                        }
                    }
                });

                modalInstance.result.then(function (selectedItem) {
                    vm.selectedCCHO = selectedItem;

                    fabric.Image.fromURL(selectedItem.img, function(img) {
                        var oImg = img.set({ left: 0, top: 0}).scale(0.5);
                        canvasFabric.add(oImg);
                    });

                    changeDrawingMode('pointer');
                }, function () {

                });
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

            redmineService.favoriteProject().then(function (results) {
                vm.dataSelect.projects = results;
            });
        }

        function changeVersionSelection(version) {
            if(version) {
                loadParentUS();
            }
        }

        function changeProjectSelection(project) {
            if(project != null) {
                redmineService.versionProject(project).then(function (results) {
                    vm.dataSelect.version = [];
                    for (let index in results.data.versions) {
                        if (results.data.versions[index].status != "closed") {
                            vm.dataSelect.version.push(results.data.versions[index]);
                        }
                    }

                    vm.createTicket.version = '';
                });
                redmineService.getCategories(project).then(function (results) {
                    vm.dataSelect.categories = results.data.issue_categories;
                    vm.createTicket.category = '';
                });

                redmineService.getMembership(project).then(function (results) {
                    vm.dataSelect.memberships = [];
                    for(let index in results.data.memberships) {
                        vm.dataSelect.memberships.push(results.data.memberships[index].user);
                    }
                    console.log(vm.dataSelect.memberships);
                    vm.createTicket.assignedTo = '';
                });
                redmineService.trackerList(project).then(function (results) {
                    vm.dataSelect.tracker = results.data.trackers;
                    for (let index in vm.dataSelect.tracker) {
                        if (vm.dataSelect.tracker[index].id == 37 && vm.createTicket.tracker == '') {
                            vm.createTicket.tracker = vm.dataSelect.tracker[index];
                        }
                    }
                });
                redmineService.statusList().then(function (results) {
                    vm.dataSelect.status = results.data.issue_statuses;
                    for (let index in vm.dataSelect.status) {
                        if (vm.dataSelect.status[index].id == 1 && vm.createTicket.status == '') {
                            vm.createTicket.status = vm.dataSelect.status[index];
                        }
                    }
                    console.log(vm.dataSelect.status);
                });

                redmineService.priorityList().then(function (results) {
                    vm.dataSelect.priorities = results.data.issue_priorities;
                    for (let index in vm.dataSelect.priorities) {
                        if (vm.dataSelect.priorities[index].id == 4 && vm.createTicket.priority == '') {
                            vm.createTicket.priority = vm.dataSelect.priorities[index];
                        }
                    }
                });

                vm.dataSelect.parentIssue = [];
                vm.createTicket.parent_issue_id = 0;
            }
        }

        function loadParentUS() {
            vm.createTicket.parent_issue_id = 0;
            redmineService.getTicketUS(vm.createTicket.project.id ,vm.createTicket.version.id, 36).then(function(results) {
               vm.dataSelect.parentIssue = results.data.issues;
               vm.createTicket.parent_issue_id = 0;
            });
        }

        function saveTicketFull() {
            vm.errorMessage = "";

            if(vm.createTicket.project == '') {
                vm.errorMessage = vm.errorMessage + "Vous devez sélectionner un projet <br />";
            }

            if(vm.createTicket.tracker == '') {
                vm.errorMessage = vm.errorMessage + "Vous devez sélectionner un tracker <br />";
            }

            if(vm.createTicket.status == '') {
                vm.errorMessage = vm.errorMessage + "Vous devez sélectionner un status <br />";
            }

            if(vm.createTicket.priority == '') {
                vm.errorMessage = vm.errorMessage + "Vous devez sélectionner une priorité <br />";
            }

            if(vm.createTicket.title == '') {
                vm.errorMessage = vm.errorMessage + "Vous devez ajouter un titre <br />";
            }

            if(vm.createTicket.description == '') {
                vm.errorMessage = vm.errorMessage + "Vous devez ajouter une description <br />";
            }

            if(vm.errorMessage == "") {
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

                    redmineService.createTicket(vm.createTicket).then(function (response) {
                        ipcRenderer.send('redmine-save-favorite', vm.createTicket);
                        let urlRedirect = urlRedmine + "issues/" + response.data.issue.id;
                        let msg = {
                            title: "Nouveau ticket créé #" + response.data.issue.id,
                            message: "Un nouveau ticket a été créé <a href onclick='openLink(\"" + urlRedirect + "\");'>Accéder au ticket</a>",
                            width: 440,
                            timeout: 6000,
                            focus: false,
                            htmlFile: 'file://' + dirnameElement + '/templates/toast-ticket-created.html?'
                        };
                        ipcRenderer.send('electron-toaster-message', msg);

                        if (vm.createTicket.reopen) {
                            redmineService.updateUSReopen(vm.createTicket.parent_issue_id.id).then(function (response) {
                            });
                        }

                        let window = remote.getCurrentWindow();
                        window.close();
                    });
                });
            }
        }

        function resetCreateTicket() {
            let window = remote.getCurrentWindow();
            window.close();
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
            return vm.createTicket.project;
        }, changeProjectSelection);

        $scope.$watch(function () {
            return vm.createTicket.version;
        }, changeVersionSelection);

        $scope.$watch(function () {
            return vm.colorSelected;
        }, changedColorSelection);

        $scope.$watch(function () {
            return vm.drawingPencil.lineWidth;
        }, changedDrawingPencilLineWidthSelection);

        $scope.$watch(function () {
            return vm.rect.opacity;
        }, changedRectOpacity)

        document.addEventListener("keydown", function(e) {
            if(vm.step == 2) {
                if(vm.objectMode != 'text') {

                }
            }
        }, false);
    }



    function ModalInstanceCtrl ($uibModalInstance, items) {
        var $ctrl = this;
        $ctrl.items = items;
        $ctrl.selected = {
            item: ''
        };

        $ctrl.ok = function () {
            $uibModalInstance.close($ctrl.selected.item);
        };

        $ctrl.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    }
})();
