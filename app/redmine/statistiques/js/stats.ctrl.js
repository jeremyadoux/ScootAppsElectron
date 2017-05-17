/**
 * Created by jadoux on 28/04/2017.
 */
(function() {
    'use strict';

    angular
        .module('app', ['ui.select', 'ngSanitize', 'chart.js'])
        .controller('statsController', statsController);

    statsController.$inject = ['$scope', 'redmineService'];

    function statsController($scope, redmineService) {
        const {ipcRenderer, remote} = require('electron');
        let vm = this;
        let urlRedmine = '';
        let dirnameElement = '';

        const regexTeamProject = /@/g;

        vm.config = {
            trackerRequirementId: 41,
            fieldPoints: 28,
            finishStatus: [
                5, //Fermer
                23, //Réaliser
                6, //Rejeter
            ],
        };

        vm.showVersionField = false;
        vm.isTeamProject = false;

        vm.project = '';
        vm.version = '';

        vm.initData = {
            projects: [],
            versions: []
        };

        vm.charts = {};

        vm.charts.avancementsUS = {
            labels: [],
            data: [],
            options: []
        };

        vm.charts.avancementsPoint = {
            labels: [],
            data: [],
            options: []
        };

        vm.charts.globalInformationsUS = {
            labels: [],
            data: [],
            options: [],
            series: []
        };

        vm.charts.globalInformationsPoint = {
            labels: [],
            data: [],
            options: [],
            series: []
        };

        ipcRenderer.on('redmine-return', (event, arg) => {
            urlRedmine =  arg.url;
            dirnameElement = arg.dirname;
            redmineService.setApiKey(arg.apikey, arg.url);
            init();
        });

        function init() {
            reloadProjectList();
        }

        function reloadProjectList() {
            redmineService.favoriteProject().then(function (results) {
                vm.initData.projects = results;
            });
        }

        function reloadVersionList(project) {
            console.log(project.name);
            if(regexTeamProject.test(project.name)) {
                vm.showVersionField = false;
                vm.isTeamProject = true;
            } else {
                vm.showVersionField = true;
                vm.isTeamProject = false;
            }

            redmineService.versionProject(project).then(function (results) {
                vm.initData.versions = [];
                for (let index in results.data.versions) {
                    if (results.data.versions[index].status != "closed" || vm.isTeamProject) {
                        vm.initData.versions.push(results.data.versions[index]);
                    }
                }

                if(vm.isTeamProject) {
                    //Execute Graph code for team graphs

                    calculTeamInformations(vm.project, vm.initData.versions);
                }
            });
        }

        function prepareDataForChartsVersion(version) {
            vm.charts.globalInformationsUS.options = {
                title: {
                    display: true,
                    text: 'Etats des UserStories'
                },
                scales: {
                    xAxes: [{
                        stacked: true,
                        ticks: {
                            autoSkip: false
                        }
                    }],
                    yAxes: [{
                        stacked: true
                    }]
                }
            };
            vm.charts.globalInformationsUS.series = [
                'UserStory raf',
                'UserStory terminées',
                'UserStory sans point'
            ];
            vm.charts.globalInformationsUS.data = [
                [],
                [],
                []
            ];
            vm.charts.globalInformationsUS.labels = [];

            vm.charts.globalInformationsPoint.options = {
                title: {
                    display: true,
                    text: 'Etats des Points'
                },
                scales: {
                    xAxes: [{
                        stacked: true,
                        ticks: {
                            autoSkip: false
                        }
                    }],
                    yAxes: [{
                        stacked: true
                    }]
                }
            };
            vm.charts.globalInformationsPoint.series = [
                'Points raf',
                'Points terminés'
            ];
            vm.charts.globalInformationsPoint.data = [
                [],
                []
            ];
            vm.charts.globalInformationsPoint.labels = [];

            vm.charts.avancementsUS.labels = [];
            vm.charts.avancementsUS.options = {
                title: {
                    display: true,
                    text: 'Avancement sur les UserStories'
                },
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero:true,
                            min: 0,
                            max: 100,
                        }
                    }],
                    xAxes: [{
                        ticks: {
                            autoSkip: false
                        }
                    }]
                }
            };
            vm.charts.avancementsUS.data = [];

            vm.charts.avancementsPoint.labels = [];
            vm.charts.avancementsPoint.options = {
                title: {
                    display: true,
                    text: 'Avancement sur les Points'
                },
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero:true,
                            min: 0,
                            max: 100
                        }
                    }],
                    xAxes: [{
                        ticks: {
                            autoSkip: false
                        }
                    }]
                }
            };
            vm.charts.avancementsPoint.data = [];


            calculRequirementInformation(vm.project, version).then(function(results) {
                for(let index in results) {
                    let data = results[index];
                    if(data !== false) {

                        let totals = {
                            usRaf : data.nbUserStoryTotal - data.nbUserStoryDown,
                            usFinish : data.nbUserStoryDown,
                            ptRaf : data.nbPointsTotal - data.nbPointsDown,
                            ptFinish: data.nbPointsDown,
                            usVide : data.nbUserStoryWithoutPoint
                        };

                        let avancementUS = Math.ceil((data.nbUserStoryDown / data.nbUserStoryTotal) * 100);
                        let avancementPoints = Math.ceil((data.nbPointsDown / data.nbPointsTotal) * 100);

                        vm.charts.globalInformationsPoint.labels.push(data.requirement.subject.substr(0, 30) + "...");
                        vm.charts.globalInformationsPoint.data[0].push(totals.ptRaf);
                        vm.charts.globalInformationsPoint.data[1].push(totals.ptFinish);

                        vm.charts.globalInformationsUS.labels.push(data.requirement.subject.substr(0, 30) + "...");
                        vm.charts.globalInformationsUS.data[0].push(totals.usRaf);
                        vm.charts.globalInformationsUS.data[1].push(totals.usFinish);
                        vm.charts.globalInformationsUS.data[2].push(totals.usVide);

                        vm.charts.avancementsUS.labels.push(data.requirement.subject.substr(0, 30) + "...");
                        vm.charts.avancementsUS.data.push(avancementUS);
                        vm.charts.avancementsPoint.labels.push(data.requirement.subject.substr(0, 30) + "...");
                        vm.charts.avancementsPoint.data.push(avancementPoints);
                    }
                }
                $scope.$apply();
            });
        }

        function calculRequirementInformation(project, version) {
            return new Promise(function(resolve, reject) {
                reloadRequirement(project, version).then(function(results) {
                    let allPromise = [];
                    for(let index in results.data.issues) {
                        let requirement = results.data.issues[index];
                        allPromise.push(loadAllRequirementData(requirement.id));
                    }

                    Promise.all(allPromise).then(function(values) {
                        resolve(values);
                    });
                });
            })
        }

        function calculTeamInformations(project, versions) {
            return new Promise(function(resolve, reject) {
                versions.sort(function(a,b) {return (a.id < b.id) ? 1 : ((b.id < a.id) ? -1 : 0);} );
                console.log(versions);

                resolve();
            });

        }

        function reloadRequirement(project, version) {
            return new Promise(function(resolve, reject) {
                let where = {
                    project_id: project.id,
                    fixed_version_id: version.id,
                    tracker_id: vm.config.trackerRequirementId,
                    status_id: '*',
                    include: 'children',
                    limit: 100
                };

                redmineService.loadTicket(where).then(function (results) {
                    resolve(results);
                });
            });
        }

        function loadAllRequirementData(id) {
            return new Promise(function(resolve, reject) {
                redmineService.getTicket(id, {include: 'children'}).then(function(requirement) {
                    let allTicketId = [];
                    if(typeof(requirement.data.issue.children) == 'undefined') {
                        resolve(false);
                    } else {
                        for (let index in requirement.data.issue.children) {
                            let userStory = requirement.data.issue.children[index];
                            allTicketId.push(userStory.id);
                        }
                        let where = {
                            issue_id: allTicketId.join(','),
                            status_id: '*',
                            limit: 100
                        };
                        redmineService.loadTicket(where).then(function (results) {
                            let data = {
                                requirement: requirement.data.issue,
                                nbPointsTotal: 0,
                                nbPointsDown: 0,
                                nbUserStoryTotal: 0,
                                nbUserStoryDown: 0,
                                nbUserStoryWithoutPoint: 0
                            };

                            for (let index in results.data.issues) {
                                data.nbUserStoryTotal += 1;
                                let userStory = results.data.issues[index];
                                let nbPointsUs = 0;
                                for (let index in userStory.custom_fields) {
                                    let customField = userStory.custom_fields[index];
                                    if (customField.id == vm.config.fieldPoints) {
                                        if (customField.value == "") {
                                            data.nbUserStoryWithoutPoint += 1;
                                        } else {
                                            nbPointsUs = Number(customField.value);
                                            data.nbPointsTotal += nbPointsUs;
                                        }
                                    }
                                }
                                let currentStatus = userStory.status.id;
                                if (vm.config.finishStatus.indexOf(currentStatus) >= 0) {
                                    data.nbUserStoryDown += 1;
                                    data.nbPointsDown += nbPointsUs;
                                }
                            }

                            resolve(data);
                        });
                    }
                });
            });
        }

        function changeProjectSelection(project) {
            reloadVersionList(project);
        }

        function changeVersionSelection(version) {
            prepareDataForChartsVersion(version);
        }

        $scope.$watch(function () {
            return vm.project;
        }, changeProjectSelection);

        $scope.$watch(function () {
            return vm.version;
        }, changeVersionSelection);

        ipcRenderer.send('redmine-get', {});
    }
})();
