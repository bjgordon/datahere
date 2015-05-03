var app = angular.module('datahereApp', ['uiGmapgoogle-maps', 'ngProgress']);

var STATE_FOUND = 1;
var STATE_WAITING = 2;
var STATE_NOT_FOUND = 3;
var STATE_FAILED = 4;

app.config(function($httpProvider) {
    //Enable cross domain calls
    $httpProvider.defaults.useXDomain = true;
});

app.config(function(uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        //    key: 'your api key',
        v: '3.17',
        libraries: 'places'
    });
});

app.controller('DataHereCtrl', function ($scope, $http, uiGmapGoogleMapApi,ngProgress) {

  $scope.onSelectedSourcesChange = function(value) {
    if ($scope.place !== undefined)
    {
      $scope.onSearch();
    }
  };

  $scope.map = {
    center: {
      latitude: -31.15535,
      longitude: 142.59933 },
    zoom: 8,
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
      options: { draggable: true },
      events: {
          dragend: function (marker, eventName, args) {

              // $scope.marker.options = {
              //     draggable: true,
              //     labelContent: "lat: " + $scope.marker.coords.latitude + ' ' + 'lon: ' + $scope.marker.coords.longitude,
              //     labelAnchor: "100 0",
              //     labelClass: "marker-labels"
              // };
          }
      }
  };

  $scope.options = {scrollwheel: false};
  var events = {
    places_changed: function (searchBox) {
        var place = searchBox.getPlaces();
        if (!place || place == 'undefined' || place.length === 0) {
            console.log('no place data :(');
            $scope.place = undefined;
            return;
        }

        $scope.place = place[0];

        $scope.map = {
            "center": {
                "latitude": place[0].geometry.location.lat(),
                "longitude": place[0].geometry.location.lng()
            },
            "zoom": 18
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
    parentdiv:"searchboxParent"
    };

  uiGmapGoogleMapApi.then(function(maps) {
    //google maps api loaded

    //initialise dom
    $scope.selectedSources = "all";
    $scope.place = {
      formatted_address : "foo",
      geometry: {
        location: new google.maps.LatLng(-35.2819998, 149.1286843)
      }
    };

    $scope.marker = {
        id: 0,
        coords: {
            latitude: $scope.place.geometry.location.lat(),
            longitude: $scope.place.geometry.location.lng()
        }
    };

    // $scope.onSearch();

  });



  var getFeatureInfoParams = [
    "REQUEST=GetFeatureInfo", "SERVICE=WMS", "VERSION=1.1.1", "FEATURE_COUNT=10", "INFO_FORMAT=application/json", "EXCEPTIONS=application%2Fvnd.ogc.se_xml"
  ];



  //onSearch. Setup the sources list, then start the search.
  $scope.onSearch = function() {
    if (!$scope.place)
    {
      console.log('No place object to search');
      return;
    }

    if (!$scope.place.geometry || !$scope.place.geometry.location)
    {
      console.log('Place didnt have geometry/location to search at');
      return;
    }

    ngProgress.start();

    console.log('Searching ' + $scope.place.formatted_address);

    if ($scope.selectedSources === "recommended")
    {
      $scope.sources = [];

      $scope.sources[$scope.sources.length] = {
          name: "Commonwealth Electoral Divisions",
          dataset: "federal-electoral-boundaries",
          wms_url: "http://nationalmap.nicta.com.au/proxy/http://geoserver-nm.nicta.com.au/admin_bnds_abs/ows",
          layer_name: "admin_bnds%3ACED_2011_AUST"
        };

      $scope.sources[$scope.sources.length] = {
          name: "MyBroadband",
          dataset: "mybroadband",
          wms_url: "https://www.mybroadband.communications.gov.au/geoserver/wms",
          layer_name: "DistributionArea"
        };

        $scope.searchSources();
    }
    else {
      //get all wms sources via ckan api
      $scope.sources =[];
      // url = 'http://www.data.gov.au//api/3/action/package_search?rows=100000&fq=res_format%3awms';
      url = 'test/package_search.json';
      $http.get(url).
        success(function(data, status, headers, config) {
          console.log('Result count=' + data.result.count + ' from url=' + url);
          for (var i = 0; i < data.result.count; i++)
          {
            var pkg = data.result.results[i];
            console.log('title=' + pkg.title);
            wms = [];
            count = 0;
            for (var j = 0; j < pkg.num_resources; j++) {
              var r = pkg.resources[j];
              if (r.format === 'wms') {
                count++;
                wms[wms.length] = {name: r.name, url: r.url, wms_layer: r.wms_layer};
              }
            }
            for (j = 0; j < wms.length; j++) {
              var name = pkg.title;
              if (wms.length > 1)
              {
                name += " - " + wms[j].name;
              }
              $scope.sources[$scope.sources.length] = {
                  name: name,
                  dataset: pkg.name,
                  wms_url: wms[j].url,
                  layer_name: wms[j].wms_layer
              };
            }
          }

          $scope.searchSources();

        }).
        error(function(data, status, headers, config) {

        });

    }
  };

  //Search each of the sources
  $scope.searchSources = function()
  {
    $scope.currentSearchNumberComplete = 0;

    var progress = $scope.currentSearchNumberComplete / $scope.sources.length;
    console.log('Progress=' + progress);
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

    var bbox = minx + "," + miny + "," + maxx + "," + maxy;
    var map = document.getElementsByClassName("angular-google-map-container")[0];
    var width = map.offsetWidth;
    var height = map.offsetHeight;


    var x = Math.floor((lng - bounds.getSouthWest().lng()) * width);
    var y = Math.floor((bounds.getNorthEast().lat() - lat) * height);

    for (var i = 0; i < $scope.sources.length; i++) {
    // for (var i = 0; i < 2; i++) {
      var source = $scope.sources[i];
      $scope.sources[i].state = STATE_WAITING;
      source.results = null;
      console.log("source.name=" + source.name);
      console.log('wms url=' +source.wms_url);

      if (source.wms_url === undefined)
      {
        console.log('ignoring undefined source.wms_url');
        break;
      }

      var url = source.wms_url;
console.log("original url=" + url);
      //remove anything query parameters so we just have the base url
      var urlparts= url.split('?');
      if (urlparts.length >= 2)
      {
        url = urlparts[0];
      }
      console.log("fixed url=" + url);

      url += "?" + getFeatureInfoParams.join("&");
      url += "&layers=" + source.layer_name;
      url += "&query_layers=" + source.layer_name;

      url += '&width=' + width;
      url += '&height=' + height;
      url += '&bbox=' + bbox;
      url += '&x=' + Math.floor(x);
      url += '&y=' + Math.floor(y);

      console.log('url=' + url);

      $http.get(url)
        .success($scope.onSearchSuccess(source));
    }
  };

  $scope.onSearchSuccess = function (source) {
    return function(data) {
      console.log('onSearchSuccess ' + source.name);
      $scope.currentSearchNumberComplete++;
      var progress = $scope.currentSearchNumberComplete / $scope.sources.length * 100;
      console.log('Progress=' + progress);
      ngProgress.set(progress);

      if (data.type !== "FeatureCollection") {
        console.log('Ignoring non-GetFeatureInfo response');
        source.state = STATE_FAILED;
        return;
      }

      if (data.features.length === 0)
      {
        console.log('Response contained no features');
        source.state = STATE_NOT_FOUND;
        return;
      }

      console.log('GetFeatureInfo OK ' + source.name);
      source.state = STATE_FOUND;
      source.results = data.features;

    };
  };
});
