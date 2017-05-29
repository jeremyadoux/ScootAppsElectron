/**
 * Created by jadoux on 09/03/2017.
 */
(function() {
    'use strict';


    angular
        .module('app')
        .service('redmineService', redmineService);


    redmineService.$inject = ['$http'];

    var listToTree = require('list-to-tree-lite');

    function redmineService($http) {
        let apiKey = "";
        let redmineUrl = "";

        let headersRedmine = {};

        function setApiKey(key, url) {
            apiKey = key;
            redmineUrl = url;

            headersRedmine = {
                'X-Redmine-API-Key': apiKey,
                'Content-Type': 'application/json'
            };
        }

        function favoriteProject(offset=0) {
            return new Promise(function(resolve, reject) {
                if(redmineUrl != "") {
                    loadProjectWithPagination().then(function(projectList) {
                        prepareProjectList(projectList).then(function(result) {
                            resolve(result);
                        });
                    });
                } else {
                    resolve([]);
                }
            });
        }

        function getCategories(project) {
            if(redmineUrl != '') {
                return $http.get(redmineUrl + "projects/" + project.id + '/issue_categories.json?limit=100', {headers: headersRedmine});
            } else {
                return new Promise(function(resolve, reject) {
                    let result = {
                        data: {
                            issue_categories: []
                        }
                    };
                    resolve(result);
                });
            }
        }

        function versionProject(project) {
            if(redmineUrl != '') {
                return $http.get(redmineUrl + "projects/" + project.id + '/versions.json?limit=100', {headers: headersRedmine});
            } else {
                return new Promise(function(resolve, reject) {
                    let result = {
                        data: {
                            versions: []
                        }
                    };
                    resolve(result);
                });
            }
        }

        function trackerList(project) {
            let result = {
                data: {
                    trackers: []
                }
            };

            return new Promise(function(resolve, reject) {
                if(redmineUrl != '') {
                    $http.get(redmineUrl + 'projects/' + project.id + '.json?include=trackers', {headers: headersRedmine}).then(function (results) {
                        result.data.trackers = results.data.project.trackers;
                        resolve(result);
                    });
                } else {
                    resolve(result);
                }
            });
        }

        function statusList() {
            if(redmineUrl != '') {
                return $http.get(redmineUrl + 'issue_statuses.json?limit=100', {headers: headersRedmine});
            } else {
                return new Promise(function(resolve, reject) {
                    let result = {
                        data: {
                            issue_statuses: []
                        }
                    };
                    resolve(result);
                });
            }
        }

        function priorityList() {
            if(redmineUrl != '') {
                return $http.get(redmineUrl + 'enumerations/issue_priorities.json?limit=100', {headers: headersRedmine});
            } else {
                return new Promise(function(resolve, reject) {
                    let result = {
                        data: {
                            issue_priorities: []
                        }
                    };
                    resolve(result);
                });
            }
        }

        function loadTicket(where) {
            return $http({
                url: redmineUrl + 'issues.json',
                method: "GET",
                params: where,
                headers: headersRedmine
            });
        }

        function getTicket(id, include) {
            return $http({
                url: redmineUrl + 'issues/'+id+'.json',
                method: "GET",
                params: include,
                headers: headersRedmine
            });
        }

        function createTicket(ticket) {
            let data = {
                issue: {
                    project_id: ticket.project.id,
                    tracker_id: ticket.tracker.id,
                    status_id: ticket.status.id,
                    priority_id: ticket.priority.id,
                    subject: ticket.title,
                    description: ticket.description
                }
            };

            if(ticket.uploads.length > 0) {
                data.issue.uploads = ticket.uploads;
            }

            if(ticket.version != "") {
                data.issue.fixed_version_id = ticket.version.id;
            }

            if(ticket.category != "") {
                data.issue.category_id = ticket.category.id;
            }

            if(ticket.assignedTo != "") {
                data.issue.assigned_to_id = ticket.assignedTo.id;
            }

            if(ticket.parent_issue_id != 0) {
                data.issue.parent_issue_id = ticket.parent_issue_id.id;
            }

            return $http.post(redmineUrl + 'issues.json', data, {headers: headersRedmine});
        }

        function getTicketUS(projectId, versionId, trackerId) {
            return $http({
                url: redmineUrl + 'issues.json',
                method: "GET",
                params: {tracker_id: trackerId, fixed_version_id: versionId, project_id: projectId, status_id: '*'},
                headers: headersRedmine
            });
        }

        function getMembership(project) {
            return $http({
                url: redmineUrl + '/projects/'+project.id+'/memberships.json',
                method: "GET",
                headers: headersRedmine
            });
        }

        function updateUSReopen(issueId) {
            return $http.put(redmineUrl + 'issues/'+issueId+'.json', {issue: {status_id: 9}}, {headers: headersRedmine});
        }

        function uploadAttachments(attachments) {
            let promises = [];

            for(let index in attachments) {
                let newPromise = new Promise(function(resolve, reject) {
                    let base64data = attachments[index].urlTHModified.split(",");

                    let screenshotBlob = b64toBlob(base64data[1], "image/png");
                    let xhrUpload = new XMLHttpRequest();
                    xhrUpload.open("POST", redmineUrl + "uploads.json?key=" + apiKey, true);
                    xhrUpload.setRequestHeader("Content-Type", "application/octet-stream");
                    xhrUpload.onreadystatechange = function () {
                        if (xhrUpload.readyState == 4) {
                            if (xhrUpload.status == 201) {
                                let jsonResponse = JSON.parse(xhrUpload.responseText);
                                resolve(jsonResponse.upload.token);
                            }
                        }
                    };
                    xhrUpload.send(screenshotBlob);
                });

                promises.push(newPromise);
            }

            return Promise.all(promises);
        }

        function loadProjectWithPagination(offset=0, limit=100, projectList=[]) {
            return new Promise(function(resolve, reject) {
                $http.get(redmineUrl + 'projects.json?limit='+limit+'&offset='+offset, {headers: headersRedmine}).then(function (results) {
                    projectList = projectList.concat(results.data.projects);
                    if(results.data.projects.length == limit) {
                        loadProjectWithPagination(offset+limit, limit, projectList).then(function(result) {
                           resolve(result);
                        });
                    } else {
                        resolve(projectList);
                    }
                });
            });
        }

        function b64toBlob(b64Data, contentType, sliceSize) {
            contentType = contentType || '';
            sliceSize = sliceSize || 512;
            var byteCharacters = atob(b64Data);
            var byteArrays = [];
            for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                var slice = byteCharacters.slice(offset, offset + sliceSize);
                var byteNumbers = new Array(slice.length);
                for (var i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                var byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
            }
            return new Blob(byteArrays, {type: contentType});
        }

        function prepareProjectList(projectList) {
            return new Promise(function(resolve, reject) {
                let newProjectList = [];


                let options = {
                    idKey: 'id',
                    parentKey: 'parent'
                };

                for (let i = 0; i < projectList.length; i++) {
                    if (projectList[i].parent) {
                        projectList[i].parent = projectList[i].parent.id;
                    }

                    if (projectList[i].status == 1) {
                        newProjectList.push(projectList[i]);
                    }
                }

                let projectTree = listToTree(newProjectList, options);

                let treeLinear = function (tree, rendered, option) {
                    for (let i = 0; i < tree.length; i++) {
                        if (tree[i].id != 16) {
                            tree[i].name = option + " " + tree[i].name;
                            rendered.push(tree[i]);
                            if (tree[i].children.length > 0) {
                                rendered = treeLinear(tree[i].children, rendered, option + '--');
                            }
                        }
                    }

                    return rendered;
                };

                let returnArrayResult = treeLinear(projectTree, [], '');

                resolve(returnArrayResult);
            });
        }

        this.favoriteProject = favoriteProject;
        this.versionProject = versionProject;
        this.trackerList = trackerList;
        this.statusList = statusList;
        this.priorityList = priorityList;
        this.createTicket = createTicket;
        this.uploadAttachments = uploadAttachments;
        this.getTicketUS = getTicketUS;
        this.updateUSReopen = updateUSReopen;
        this.setApiKey = setApiKey;
        this.getCategories = getCategories;
        this.loadTicket = loadTicket;
        this.getTicket = getTicket;
        this.getMembership = getMembership;

        /*return {
            favoriteProject: favoriteProject,
            versionProject: versionProject,
            trackerList: trackerList,
            statusList: statusList,
            priorityList: priorityList,
            createTicket: createTicket,
            uploadAttachments: uploadAttachments,
            getTicketUS: getTicketUS,
            setApiKey: setApiKey
        }*/
    }
})();
