
angular.module('portal.services', [])
.factory('Conf', ['$rootScope', '$http', '$q', function($rootScope, $http, $q) {
	"use strict";
	var confs = {};
	var mode = $rootScope.mode;
	var getConf = function() {
		var deferredconf = $q.defer();
		if (confs[mode]) {
			deferredconf.resolve(confs[mode]); 
		} else {
			$http.get('data/confs.json').success(function(data) {
				confs =  data;
				deferredconf.resolve(confs[mode]);
			});
		}	
		return deferredconf.promise;	
	};

	return {
		conf: getConf
	};
}])
.factory('Links', ['$http', '$q', function($http, $q) {
	"use strict";

	var menus = [];
	var headers = [];
	
	var getMenus = function() {
		var deferredMenus = $q.defer();
		if (menus.length) {
			deferredMenus.resolve(menus); 
		} else {
			$http.get('data/menus.json').success(function(data) {
				menus = data;
				deferredMenus.resolve(data);
			});
		}	
		return deferredMenus.promise;	
	};
	var getHeaders = function() {
		var deferredheaders = $q.defer();
		if (headers.size) {
			deferredheaders.resolve(headers); 
		} else {
			$http.get('data/headerApps.json').success(function(data) {
				headers =  data;
				deferredheaders.resolve(data);
			});
		}	
		return deferredheaders.promise;	
	};
	var getMenuTypes = function() {
		var deferredMenu = $q.defer();
		getMenus().then(function(menus) {
			var datas = _(menus).map(mapMenuToMenuInfo);
			deferredMenu.resolve(datas);
		});
		return deferredMenu.promise;
	};
	var getMenuInfoById = function(id) {
		var deferredMenu = $q.defer();
		if (id === -1) {
			deferredMenu.resolve(null);	
		} else {
			getMenus().then(function(menus) {
				var datas = _(menus)
				.filter(function(menu) {
					return menu.menuId === id;
				})
				.map(mapMenuToMenuInfo);
				deferredMenu.resolve(datas[0]);
			});	
		}
		
		return deferredMenu.promise;
	};

	var mapMenuToMenuInfo = function(menu){
		return {
			menuId : menu.menuId,
			name: menu.name,
			icon : menu.icon     
		};
	};

	return {
		menus : getMenus,
		headers : getHeaders,
		menuTypes : getMenuTypes,
		menuById: getMenuInfoById
	};
}])
.factory('Jenkins', ['$http', '$q', 'Conf', function($http, $q, Conf) {
	"use strict";
	var jenkinsUrl = null, hoursToShow = null, jenkinsUpdateInterval = null;
	
	var loadConf = function() {		
		return Conf.conf().then(function(conf) {
			jenkinsUrl = conf.jenkinsUrl;
			hoursToShow = conf.jenkinsIntervalToShow;
			jenkinsUpdateInterval = conf.jenkinsUpdateInterval;
		});
	};
	var getInterval = function() {
		return jenkinsUpdateInterval;
	};
	
	var consult = function() {
		var deferredJobs = $q.defer();

		var filteredJobs = [];
		var now = Date.now();
		var interval = 3600000 * hoursToShow;
		/* 
		 * Request and parse a specific job
		 * If request fails, looks into potentiel "sub jobs"
		 */
		var queryJob = function(job) {
			$http.get(job.url + "/lastCompletedBuild/api/json").then(
				//success
				function(resp) {
					if ((now - job.lastCompletedBuild.timestamp) < interval) {
						var jobDatas = resp.data;
						jobDatas.name = job.name;
						jobDatas.description = job.description;
						jobDatas.configureUrl = job.url + "/configure";
						jobDatas.outputUrl = jobDatas.url + '/console';
						filteredJobs.push(jobDatas);
						deferredJobs.notify("New Job");
					}
				},
				//error
				function() {
					queryJobs(job.url)
				}
			);
		}

		/**
		 * Parse sub jobs
		 */
		var queryJobs = function(queryUrl) {
			$http.get(queryUrl + "/api/json?tree=jobs[name,description,url,lastCompletedBuild[timestamp]]")
			.then(function(result) {
				_(result.data.jobs).each(queryJob);
				deferredJobs.resolve(filteredJobs);
				}
			);	
		}
		queryJobs(jenkinsUrl);

		return deferredJobs.promise;
	};

	return {
		init: loadConf,
		jobs : consult,
		interval : getInterval
	};
}])
.factory('Sonar', ['$http', '$q', 'Conf', function($http, $q, Conf) {
	"use strict";
	var sonarUrl;

	var loadConf = function() {		
		return Conf.conf().then(function(conf) {
			sonarUrl = conf.sonarUrl;
		});
	};

	var listApps = function() {
		var deferedApps = $q.defer();
		$http.get(sonarUrl + "/api/resources").success(function(data) {
			deferedApps.resolve(data);
		});
		return deferedApps.promise;
	};
	return {		
		init: loadConf,
		apps: listApps
	};
}])
.factory('Feeds', ['$http', '$q', 'Conf', function($http, $q, Conf) {
	"use strict";
	var defaultFeeds, feedsProxy, limit, updateInterval;

	var loadConf = function() {		
		return Conf.conf().then(function(conf) {
			feedsProxy 		= conf.feedsProxyUrl;
			defaultFeeds 	= conf.defaultFeeds;
			limit 			= conf.feedsLimit;
			updateInterval	= conf.updateInterval;
		});
	};
	var getDefaultFeeds = function() {
		return defaultFeeds;
	};
	var getInterval = function() {
		return updateInterval;
	};

	var feeds = function(feedsUrls) {
		var deferedFeeds = $q.defer();
		var feedsPromises = _(feedsUrls).map(function(url) {
			return getFeeds(url);
		});
		$q.all(feedsPromises)
		.then(function(results) {
			deferedFeeds.resolve(_.chain(results).union().flatten(true).value());
		});
		return deferedFeeds.promise;
	};
	
	var getFeeds = function (url) {
		return $http.get(feedsProxy, {
			params: {
				q: url,
				limit: limit
			}
		}).then(function(response) {
			return response.data;
		});	
	};

	return {		
		init: loadConf,
		defaultFeeds : getDefaultFeeds,
		interval: getInterval,
		feeds: feeds
	};
}]);