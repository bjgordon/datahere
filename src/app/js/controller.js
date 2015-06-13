'use strict';
/*global console, document, window, google */

var app = angular.module('datahereApp', ['uiGmapgoogle-maps', 'ngProgress']);

var STATE_FOUND = 1;
var STATE_WAITING = 2;
var STATE_NOT_FOUND = 3;
var STATE_FAILED = 4;

app.config(function($httpProvider) {
    //Enable cross domain calls
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
});

app.config(function(uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        //    key: 'your api key',
        v: '3.17',
        libraries: 'places'
    });
});

app.config(function($logProvider) {
  if (window.location.host.match(/localhost/)) {
    $logProvider.debugEnabled(false);
  }
  else {
    $logProvider.debugEnabled(false);
  }
});


app.controller('datahereCtrl', function ($scope, $http, $log, uiGmapGoogleMapApi,ngProgress) {
  $scope.log = $log;

  $scope.config = {
    proxy: 'http://nationalmap.nicta.com.au/proxy/',
    serversToProxy : ['http://maps.aims.gov.au/geoserver/wms',
        'http://www.data.gov.au',
        'https://www.data.gov.au',
        'http://data.gov.au',
        'https://data.gov.au',
        'http://geoserver-nm.nicta.com.au',
        'http://services.aad.gov.au',
        'https://sarigdata.pir.sa.gov.au/geoserver',
        'http://ga.gov.au',
        'http://sentinel.ga.gov.au/geoserver'
      ]
  };

  $scope.search = {
    address: undefined,
    id: 0,
    sources: []
  };

  $scope.onSelectedSourcesChange = function() {
    if ($scope.place !== undefined)
    {
      $scope.onSearch();
    }
  };

  $scope.map = {
    center: {
      latitude: -27.921,
      longitude: 133.247 },

    zoom: 3,
    options: {
      panControl: false,
      zoomControl: true,
      streetViewControl: false
    }
  };

  $scope.marker = {
      id: 0,
      coords: {
          latitude: 52.47491894326404,
          longitude: -1.8684210293371217
      },
      options: { draggable: false }
  };

  $scope.options = {scrollwheel: false};
  var events = {
    places_changed: function (searchBox) {
        var place = searchBox.getPlaces();
        if (!place || place === 'undefined' || place.length === 0) {
            $scope.log.info('no place data :(');
            $scope.place = undefined;
            return;
        }

        $scope.place = place[0];

        $scope.map = {
            'center': {
                'latitude': place[0].geometry.location.lat(),
                'longitude': place[0].geometry.location.lng()
            },
            'zoom': 18
        };
        $scope.marker = {
            id: 0,
            coords: {
                latitude: place[0].geometry.location.lat(),
                longitude: place[0].geometry.location.lng()
            }
        };

        //Start the search at this place.
        $scope.onSearch();
    }
  };
  $scope.searchbox = {
    template:'searchbox.tpl.html',
    events:events,
    parentdiv:'searchboxParent'
    };

  uiGmapGoogleMapApi.then(function() {
    //google maps api loaded

    //initialise dom
    $scope.selectedSources = 'recommended';

  });

  var getFeatureInfoParams = [
    'REQUEST=GetFeatureInfo', 'SERVICE=WMS', 'VERSION=1.1.1', 'FEATURE_COUNT=10', 'INFO_FORMAT=application/json', 'EXCEPTIONS=application%2Fvnd.ogc.se_xml'
  ];

  //Setup the sources list, then start the search.
  $scope.onSearch = function() {

    $scope.search.id++;
    ngProgress.reset();
    $scope.search.address = undefined;

    if (!$scope.place)
    {
      $scope.log.info('No place object to search');
      return;
    }

    if (!$scope.place.geometry || !$scope.place.geometry.location)
    {
      $scope.log.info('Place didnt have geometry/location to search at');
      return;
    }

    ngProgress.start();

    $scope.search.address = $scope.place.formatted_address;

    if ($scope.selectedSources === 'recommended')
    {
      $scope.search.sources = [];

      $scope.search.sources[$scope.search.sources.length] = {
          name: 'Commonwealth Electoral Divisions',
          dataset: 'federal-electoral-boundaries',
          wms_url: 'http://nationalmap.nicta.com.au/proxy/http://geoserver-nm.nicta.com.au/admin_bnds_abs/ows',
          layer_name: 'admin_bnds%3ACED_2011_AUST'
        };

        $scope.search.sources[$scope.search.sources.length] = {
          name: 'MyBroadband',
          dataset: 'mybroadband',
          wms_url: 'https://programs.communications.gov.au/geoserver/wms',
          layer_name: 'public:MyBroadband_Map'
        };

        $scope.search.sources[$scope.search.sources.length] = {
          name: 'Taxation Statistics 2011-12',
          dataset: 'taxation-statistics-2011-12',
          wms_url: 'http://data.gov.au/geoserver/taxation-statistics-2011-12/wms',
          layer_name: '95d9e550_8b36_4273_8df7_2b76c140e73a'
        };

        $scope.searchSources();
    }
    else {
      //get all wms sources via ckan api
      $scope.search.sources = undefined;
      var url = 'http://nationalmap.nicta.com.au/proxy/http://www.data.gov.au//api/3/action/package_search?rows=100000&fq=res_format%3awms';
      // url = 'test/package_search.json';
      $http.get(url).
        success(function(data) {
          if (!$scope.search.sources) {
            $scope.search.sources = [];
          }
          $scope.log.debug('Result count=' + data.result.count + ' from url=' + url);
          for (var i = 0; i < data.result.count; i++)
          {
            var pkg = data.result.results[i];
            var wms = [];
            var count = 0;
            for (var j = 0; j < pkg.num_resources; j++) {
              var r = pkg.resources[j];
              if (r.format !== undefined && r.format.toLowerCase() === 'wms') {
                count++;
                wms[wms.length] = {name: r.name, url: r.url, wms_layer: r.wms_layer};
              }
            }
            for (j = 0; j < wms.length; j++) {
              var name = pkg.title;
              if (wms.length > 1)
              {
                name += ' - ' + wms[j].name;
              }
              $scope.search.sources[$scope.search.sources.length] = {
                  name: name,
                  dataset: pkg.name,
                  wms_url: wms[j].url,
                  layer_name: wms[j].wms_layer
              };
            }
          }

          $scope.searchSources();

        }).
        error(function(data, status) {
          $scope.log.error(status + ' - unable to get list of sources from data.gov.au: ');
          //todo show error
        });

    }
  };

  //Search each of the sources
  $scope.searchSources = function()
  {
    $scope.search.completedCount = 0;

    var progress = $scope.search.completedCount / $scope.search.sources.length;
    $scope.log.debug('Progress=' + progress);
    ngProgress.set(progress);
    var latLng = $scope.place.geometry.location;
    var lat = latLng.lat();
    var lng = latLng.lng();

    var bounds = new google.maps.Circle({
      center: $scope.place.geometry.location,
      radius: 50.0
    }).getBounds();
    var minx = bounds.getSouthWest().lng();
    var miny = bounds.getSouthWest().lat();
    var maxx = bounds.getNorthEast().lng();
    var maxy = bounds.getNorthEast().lat();

    var bbox = minx + ',' + miny + ',' + maxx + ',' + maxy;
    //todo remove DOM dependency
    var map = document.getElementsByClassName('angular-google-map-container')[0];
    var width = map.offsetWidth;
    var height = map.offsetHeight;


    var x = Math.floor((lng - bounds.getSouthWest().lng()) * width);
    var y = Math.floor((bounds.getNorthEast().lat() - lat) * height);

    for (var i = 0; i < $scope.search.sources.length; i++) {
      var source = $scope.search.sources[i];
      source.state = STATE_WAITING;
      source.results = null;
      $scope.log.debug('source.name=' + source.name);
      $scope.log.debug('wms url=' +source.wms_url);

      if (source.wms_url === undefined)
      {
        $scope.log.info('ignoring undefined source.wms_url');
        break;
      }

      for (var j = 0; j < $scope.config.serversToProxy.length; j++) {
        var server = $scope.config.serversToProxy[j];
        if (source.wms_url.toLowerCase().indexOf(server.toLowerCase()) === 0) {
          $scope.log.debug('Proxying ' + $scope.wms_url);
          source.wms_url = $scope.config.proxy + source.wms_url;
          break;
        }
      }

      var url = source.wms_url;
      $scope.log.debug('original url=' + url);
      //remove anything query parameters so we just have the base url
      var urlparts= url.split('?');
      if (urlparts.length >= 2)
      {
        url = urlparts[0];
      }
      $scope.log.debug('fixed url=' + url);

      url += '?' + getFeatureInfoParams.join('&');
      url += '&layers=' + source.layer_name;
      url += '&query_layers=' + source.layer_name;

      url += '&width=' + width;
      url += '&height=' + height;
      url += '&bbox=' + bbox;
      url += '&x=' + Math.floor(x);
      url += '&y=' + Math.floor(y);

      $scope.log.debug('url=' + url);

      $http.get(url)
        .success($scope.onSearchSuccess($scope.search.id,source))
        .error($scope.onSearchError(source));

    }
  };

  $scope.onSearchComplete = function() {
    $scope.search.completedCount++;
    var progress = $scope.search.completedCount / $scope.search.sources.length * 100;
    $scope.log.debug('Progress=' + progress);
    ngProgress.set(progress);
    if (progress === 100)
    {
      ngProgress.reset();
    }
  };
  $scope.onSearchError = function(source) {
    return function(data, status, headers, config) {
      source.state = STATE_FAILED;
      $scope.onSearchComplete();
    };
  };

  $scope.onSearchSuccess = function (searchId, source) {
    return function(data) {

      if ($scope.search.id !== searchId)
      {
        //Current search has changed since this request was made, so
        //discard the results
        $scope.log.debug('Discarding search results for searchid: ' + searchId);
        return;
      }
      $scope.onSearchComplete();

      $scope.log.debug('onSearchSuccess ' + source.name);

      if (data.type !== 'FeatureCollection') {
        $scope.log.debug('Ignoring non-GetFeatureInfo response from ' + source.name);
        source.state = STATE_FAILED;
        return;
      }

      if (data.features.length === 0)
      {
        $scope.log.debug('Response contained no features');
        source.state = STATE_NOT_FOUND;
        return;
      }

      $scope.log.debug('GetFeatureInfo OK ' + source.name);
      source.state = STATE_FOUND;
      source.results = data.features;

    };
  };
});
