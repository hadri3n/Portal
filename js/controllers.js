/*jshint strict: true */

/* Controllers */

angular.module('portail-qualif.controllers', [])
	.controller('HeaderCtrl', ['$scope', 'Links', function($scope, Links) {
		"use strict";
		Links.headers.then(function(headers) {
			$scope.headerApps = headers;
		});	

	}])
	.controller('MenuLeftCtrl', ['$scope', 'Links', function($scope, Links) {
		"use strict";
		Links.menus.then(function(menus) {
			$scope.menus = menus;
		});		

		$scope.$watch('filter', function() {
			_.each($scope.menus, function(menu) {
				menu.isCollapsed = false;
			});
		});
	}])
	.controller('FavoritesCtrl', ['$scope', function($scope) {
		"use strict";
		$scope.favorites= angular.fromJson(localStorage.favorites);
		$scope.editMode = false;
		if (!$scope.favorites) {
			$scope.favorites = [];
		}
		
		$scope.removeFavorite = function(favorite, $event) {
	
			$scope.favorites = _.without($scope.favorites, favorite);
			localStorage.favorites = angular.toJson($scope.favorites);
			if ($event.stopPropagation) {
				$event.stopPropagation();
			}
			if ($event.preventDefault) {
				$event.preventDefault();
			}
			$event.cancelBubble = true;
			$event.returnValue = false;
			
		};
		$scope.eraseFavorites = function() {
			localStorage.favorites = angular.toJson([]);
			$scope.favorites = [];
		};
		$scope.dropCallback = function (event, ui, favorites) {
		  localStorage.favorites = angular.toJson(favorites);
		};

	}])
	.controller('JenkinsCtrl', ['$scope', '$interval', 'Jenkins', function($scope, $interval, Jenkins) {
		"use strict";
		var updateInterval = Jenkins.interval.then(function(up) {
			$interval(getJobsResults, up);
		});
		
		var getJobsResults = function() {
			Jenkins.jobs().promise.then(function(jobs) {
				$scope.jobs= jobs;				
			});
		};
		getJobsResults();
	}]);