/**
 * Created by jadoux on 09/03/2017.
 */
(function() {
    'use strict';

    angular
        .module('app')
        .service('redmineService', redmineService);

    redmineService.$inject = ['$http'];

    function redmineService($http) {
        let apiKey = "d8c6c58bf48b8afa6bfff55c07868659c1e84535";
        let redmineUrl = "https://projects.visiativ.com/";

        let headersRedmine = {
            'X-Redmine-API-Key': apiKey,
            'Content-Type': 'application/json'
        };

        function createTicket(ticket) {
            let data = {
                issue: {
                    project_id: ticket.project,
                    tracker_id: ticket.tracker,
                    status_id: ticket.status,
                    priority_id: ticket.priority,
                    subject: ticket.title,
                    description: "Email Utilisateur : " + ticket.email + "\n\r" + ticket.description
                }
            };

            if(ticket.uploads.length > 0) {
                data.issue.uploads = ticket.uploads;
            }

            return $http.post(redmineUrl + 'issues.json', data, {headers: headersRedmine});
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


        this.createTicket = createTicket;
        this.uploadAttachments = uploadAttachments;
    }
})();
