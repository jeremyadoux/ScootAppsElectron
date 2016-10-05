import http from 'http';
import storage from 'electron-json-storage';
const xml2js = require('xml2js');

import env from '../env';

export default function webservicesVdoc(url) {
    var token;
    var loginAuth;
    var passwordAuth;

    var parser = new xml2js.Parser();
    var builder = new xml2js.Builder();

    return {
        setAuthentication: setAuthentication,
        authentication: authentication,
        getListGroup: getListGroup,
        getListMail: getListMail
    };

    function setAuthentication(login, password) {
        return new Promise((resolve, reject) => {
            loginAuth = login;
            passwordAuth = password;

            authentication().then(function(e) {
                storage.set(env.storageAccountPassword, {login: loginAuth, password: passwordAuth}, (error) => {
                    if (error) throw error;
                });
                resolve(e);
            }, function(e) {
                reject(e);
            });
        });
    }

    function getListGroup() {
        return new Promise((resolve, reject) => {
            if (typeof token != 'undefined') {
                let xmlJson = {
                    view: {
                        $: {
                            'mlns:vw1': 'http://www.axemble.com/vdoc/view'
                        },
                        header: {
                            configuration: {
                                param: {
                                    $: {
                                        name: 'maxlevel',
                                        value: -1
                                    }
                                }
                            },
                            definition: {
                                $: {
                                    class: 'com.axemble.vdoc.sdk.interfaces.IOrganization'
                                },
                                definition: {
                                    $: {
                                        class: 'com.axemble.vdoc.sdk.interfaces.IGroup'
                                    }
                                }
                            }
                        }
                    }
                };

                let xml = builder.buildObject(xmlJson);

                let options = {
                    host : url,
                    path : '/vdoc/navigation/flow?module=directory&cmd=view&_AuthenticationKey='+token,
                    method: "POST"
                };
                executeRequest(options, xml).then(function(e) {
                    parser.parseString(e, function (err, result) {
                        //console.log(result.view.body["0"].organization);
                        let groupList = transformGroupList(result.view.body["0"].organization);
                        storage.set(env.storageGroupList, groupList, (error) => {
                            if (error) throw error;
                        });
                        resolve(groupList)
                    });
                });
            } else {
                authentication().then(function(data) {
                    getListGroup().then(
                        function(data) {
                            resolve(data);
                        }, function(error) {
                            reject(error);
                        });
                }, function(error) {
                    reject(error);
                })
            }

        });
    }

    function getListMail(groupId) {
        return new Promise((resolve, reject) => {
            if (typeof token != 'undefined') {
                let xmlJson = {
                    view: {
                        $: {
                            'mlns:vw1': 'http://www.axemble.com/vdoc/view'
                        },
                        header: {
                            configuration: {
                                param: {
                                    $: {
                                        name: 'maxlevel',
                                        value: -1
                                    }
                                }
                            },
                            scopes: {
                                group: {
                                    $: {
                                        "protocol-uri": "uri://vdoc/group/"+groupId
                                    }
                                }
                            },
                            definition: {
                                $: {
                                    class: 'com.axemble.vdoc.sdk.interfaces.IGroup'
                                },
                                definition: {
                                    $: {
                                        class: 'com.axemble.vdoc.sdk.interfaces.IUser'
                                    }
                                }
                            }
                        }
                    }
                };

                let xml = builder.buildObject(xmlJson);

                let options = {
                    host : url,
                    path : '/vdoc/navigation/flow?module=directory&cmd=view&_AuthenticationKey='+token,
                    method: "POST"
                };

                executeRequest(options, xml).then(function(e) {
                    parser.parseString(e, function (err, result) {
                        console.log(result.view.body[0]);
                        let groupListMail = transformMailListInformation(result.view.body[0]);
                        resolve(groupListMail);
                    });
                }, function(e) {
                    reject({
                        code: 404,
                        message: "Error occurend"
                    });
                });
            } else {
                authentication().then(function(data) {
                    getListMail(groupId).then(function(data) {resolve(data);}, function(error) {reject(error);});
                }, function(error) {
                    reject(error);
                })
            }
        });
    }

    function authentication() {
        return new Promise((resolve, reject) => {
            let account = {
                authenticate: {
                    header: {
                        $: {
                            login: loginAuth,
                            password: passwordAuth,
                            timeout: 36000
                        }
                    }
                }
            };

            let xml = builder.buildObject(account);

            let options = {
                host: url,
                path: '/vdoc/navigation/flow?module=portal&cmd=authenticate',
                method: "POST"
            };

            executeRequest(options, xml).then(function (e) {
                parser.parseString(e, function (err, result) {
                    if(typeof result.authenticate != 'undefined' && typeof result.authenticate.body[0].token != 'undefined') {
                        token = result.authenticate.body["0"].token["0"].$.key;
                        resolve(result);
                    } else {
                        reject({
                            code: 201,
                            message: "Authentication failed 1",
                            result: result
                        });
                    }
                });
            }, function(e) {
                reject({
                    code: 201,
                    message: "Authentication failed 2"
                });
            });
        });
    }

    //@private
    function transformGroupList(data) {
        let groupList = [];
        data.forEach(function(group) {
            if(typeof group.group != "undefined") {
                group.group.forEach(function (value) {
                    groupList.push(value.$);
                });
            }
        });

        return groupList;
    }

    //@private
    function transformMailListInformation(data) {
        let groupListMail = [];

        if(typeof data.user != "undefined") {
            data.user.forEach(function (value) {
                groupListMail.push(value.$.email);
            });
        }

        if(typeof data.group != "undefined" && data.group.length > 0) {
            data.group.forEach(function (value) {
                let result = transformMailListInformation(value);
                groupListMail = groupListMail.concat(result);
            });

            return groupListMail;
        }

        return groupListMail;
    }

    //@private
    function executeRequest(options, body) {
        return new Promise((resolve, reject) => {
            var req = http.request(options, function (res) {
                res.setEncoding('utf8');
                let output = '';
                res.on('data', function (chunk) {
                    output += chunk;
                });

                res.on('end', function () {
                    resolve(output);
                });
            });
            req.on('error', function (e) {
                reject(e)
            });
            req.write(body);
            req.end();
        });
    }
}
