(function() {
    'use strict';

    var jsrMocks = function($window) {

        var $mocks;

        return {

            setMocks: function(mocks) {
                $mocks = mocks;
            },

            $get: function($log, $http) {
                var invokeStaticAction = function() {
                    $log.debug('$mocks is an object:', $mocks);
                    var lastArg = arguments[arguments.length - 1],
                        callback = lastArg,
                        mock = $mocks[arguments[0]],
                        result = mock.method(arguments),
                        event = {
                            status: true
                        };
                    if (typeof(callback) === 'object') {
                        callback = arguments[arguments.length - 2];
                    }
                    setTimeout(function() {
                        callback(result, event);
                    }, mock.timeout);
                };

                var invokeHTTPAction = function() {
                    $log.debug('$mocks is not an object:', mockType, $mocks);
                    var lastArg = arguments[arguments.length - 1];
                    var callback = lastArg;
                    var mockName = arguments[0];
                    var regex = /(\w*)?}/;
                    var match = regex.exec(mockName);

                    mockName = match[0].split('\}')[0];

                    var url = $mocks + mockName;
                    var event = {
                        status: true
                    };

                    if (typeof(callback) === 'object') {
                        callback = arguments[arguments.length - 2];
                    }

                    $log.debug('http mock url:', url);

                    $http.get(url).
                    success(function(data) {
                        var result = data;
                        $log.debug(data);
                        setTimeout(function() {
                            callback(result, event);
                        }, 100);
                    }).
                    error(function(data, status, headers, config) {
                        $log.error(data, status, headers, config);
                    });

                };
                if (!angular.isDefined($window.Visualforce)) {
                    var mocker,
                        mockType = typeof($mocks);
                    if (mockType === 'object') {
                        mocker = invokeStaticAction;

                    } else {

                        mocker = invokeHTTPAction;
                    }

                    return {
                        remoting: {
                            Manager: {
                                invokeAction: mocker
                            }
                        }
                    };

                } else {
                    return Visualforce;
                }


            }
        };
    };

    var jsr = function(jsrMocks, $q, $rootScope) {
        var Visualforce = jsrMocks;

        console.log('testing', arguments, Visualforce);

        return function(request) {
            var deferred = $q.defer();

            var parameters = [request.method];

            if (request.args) {

                for (var i = 0; i < request.args.length; i++) {
                    parameters.push(request.args[i]);
                }
            }

            var callback = function(result, event) {
                $rootScope.$apply(function() {
                    if (event.status) {
                        deferred.resolve(result);
                    } else {
                        deferred.reject(event);
                    }
                });
            };

            parameters.push(callback);

            if (request.options) {
                parameters.push(request.options);
            }

            Visualforce.remoting.Manager.invokeAction.apply(Visualforce.remoting.Manager, parameters);

            return deferred.promise;
        };
    };


    angular.module('jsrMocks', [])
        .provider('jsrMocks', ['$window', jsrMocks])
        .factory('jsr', ['jsrMocks', '$q', '$rootScope', jsr]);

}());
