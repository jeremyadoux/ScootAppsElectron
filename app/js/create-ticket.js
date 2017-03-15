(function() {
    'use strict';

    angular
        .module('app', ['ui.select', 'ngSanitize'])
        .controller("createTicketCtrl", createTicketCtrl);

    createTicketCtrl.$inject = ['$scope', 'redmineService'];

    function createTicketCtrl($scope, redmineService) {
        const {ipcRenderer, desktopCapturer, remote} = require('electron');

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
        vm.currentScreenObj = currentScreenObj;
        vm.nextScreen = nextScreen;
        vm.previousScreen = previousScreen;
        vm.changeDrawingMode = changeDrawingMode;
        vm.goToCreateTicket = goToCreateTicket;
        vm.saveTicketFull = saveTicketFull;
        vm.loadParentUS = loadParentUS;
        vm.clickedImage = clickedImage;

        //Attributes
        vm.sources = [];
        vm.selectedSources = [];
        vm.step = 1;
        vm.currentScreen = 0;
        vm.drawingMode = "pointer";

        //Ticket information
        vm.createTicket = {
            project: "",
            tracker: "",
            status: "",
            version: "",
            priority: "",
            title: "",
            description: "",
            parent_issue_id: 0,
            reopen: false
        };
        vm.dataSelect = {
            projects: [],
            tracker: [],
            status: [],
            version: [],
            priorities: [],
            parentIssue: []
        };



        ipcRenderer.on('redmine-return', (event, arg) => {
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
                vm.createTicket.priority = arg.priority;
                vm.createTicket.parent_issue_id = arg.parent_issue_id;

                $scope.$apply();
            }
        });

        ipcRenderer.send('redmine-get', {});

        function init() {
            desktopCapturer.getSources({ types:['window', 'screen'], thumbnailSize: {width: 1600, height: 1600} }, function(error, sources) {
                for (let source of sources) {
                    vm.sources.push({
                        id: source.id,
                        name: source.name,
                        urlTH: source.thumbnail.toDataURL(),
                        urlTHModified: source.thumbnail.toDataURL(),
                        jsonModify: false,
                        clicked: false
                    });
                }

                $scope.$apply();
            });
        }

        function saveForm() {
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
            let currentObj = currentScreenObj();
            if(currentObj.jsonModify) {
                canvasFabric.loadFromJSON(currentObj.jsonModify, canvasFabric.renderAll.bind(canvasFabric));
            } else {
                fabric.Image.fromURL(currentObj.urlTH, function(oImg) {
                    canvasFabric.setWidth(oImg.width);
                    canvasFabric.setHeight(oImg.height);
                    canvasFabric.setBackgroundImage(oImg, canvasFabric.renderAll.bind(canvasFabric));
                });
            }
        }

        function changeDrawingMode(mode) {
            vm.drawingMode = mode;
            if(mode == "pencil") {
                canvasFabric.isDrawingMode = true;
            } else {
                canvasFabric.isDrawingMode = false;
            }
        }

        function mousedownCanvas(o) {
            if(vm.drawingMode == "square") {
                isDown = true;
                var pointer = canvasFabric.getPointer(o.e);
                origX = pointer.x;
                origY = pointer.y;
                var pointer = canvasFabric.getPointer(o.e);
                rect = new fabric.Rect({
                    left: origX,
                    top: origY,
                    originX: 'left',
                    originY: 'top',
                    width: pointer.x - origX,
                    height: pointer.y - origY,
                    angle: 0,
                    fill: 'rgba(255,0,0,0.5)',
                    transparentCorners: false
                });
                canvasFabric.add(rect);
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
        }

        function mouseupCanvas(o) {
            isDown = false;
        }

        function goToCreateTicket() {
            vm.selectedSources[vm.currentScreen].urlTHModified = canvasFabric.toDataURL();
            vm.selectedSources[vm.currentScreen].jsonModify = canvasFabric.toJSON();
            vm.step = 3;

            redmineService.favoriteProject().then(function (results) {
                for(let index in results.data.projects) {
                    if(results.data.projects[index].description != 'Regroupement alphabétique'
                        && results.data.projects[index].id != 16
                        && results.data.projects[index].id != 325
                        && results.data.projects[index].id != 114
                        && results.data.projects[index].id != 80
                        && results.data.projects[index].id != 196
                        && results.data.projects[index].id != 89
                        && results.data.projects[index].id != 12
                        && results.data.projects[index].id != 220
                        && results.data.projects[index].id != 114
                        && results.data.projects[index].status == 1
                    )
                        vm.dataSelect.projects.push(results.data.projects[index]);

                }
            });
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
                });
                redmineService.trackerList().then(function (results) {
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
                });

                redmineService.priorityList().then(function (results) {
                    vm.dataSelect.priorities = results.data.issue_priorities;
                    for (let index in vm.dataSelect.priorities) {
                        if (vm.dataSelect.priorities[index].id == 4 && vm.createTicket.priority == '') {
                            vm.createTicket.priority = vm.dataSelect.priorities[index];
                        }
                    }
                });
            }
        }

        function loadParentUS() {
            vm.createTicket.parent_issue_id = 0;
            redmineService.getTicketUS(vm.createTicket.project.id ,vm.createTicket.version.id, 36).then(function(results) {
               vm.dataSelect.parentIssue = results.data.issues;
            });
        }

        function saveTicketFull() {
            redmineService.uploadAttachments(vm.selectedSources).then(function(response) {
                vm.createTicket.uploads = [];
                for(let i = 0; i < response.length; i++) {
                    vm.createTicket.uploads.push({
                        token: response[i],
                        filename: "image"+i+".png",
                        content_type: "image/png"
                    });
                }

                redmineService.createTicket(vm.createTicket).then(function(response) {
                    ipcRenderer.send('redmine-save-favorite', vm.createTicket);
                    if(vm.createTicket.reopen) {
                        redmineService.updateUSReopen(vm.createTicket.parent_issue_id.id).then(function(response) {
                            console.log('plop');
                        });
                    }

                    let window = remote.getCurrentWindow();
                    window.close();
                });
            });
        }

        $scope.$watch(function () {
            return vm.createTicket.project;
        }, changeProjectSelection);
    }
})();
