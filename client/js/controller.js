var app = angular.module('datahereApp', ['uiGmapgoogle-maps']);

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

app.controller('GFICtrl', function ($scope, $http, uiGmapGoogleMapApi) {

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

              $scope.marker.options = {
                  draggable: true,
                  labelContent: "lat: " + $scope.marker.coords.latitude + ' ' + 'lon: ' + $scope.marker.coords.longitude,
                  labelAnchor: "100 0",
                  labelClass: "marker-labels"
              };
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
        $scope.search();
    }
  };
  $scope.searchbox = {
    template:'searchbox.tpl.html',
    events:events,
    parentdiv:"searchboxParent"
    };

  uiGmapGoogleMapApi.then(function(maps) {
    //google maps api loaded
    });

  $scope.sources = [];

  // $scope.sources[$scope.sources.length] = {
  //     name: 'MyBroadband_GetFeatureInfo_38SydneyAv',
  //     dataset: '',
  //     wms_url: 'test/GetFeatureInfo_38SydneyAv.json',
  //     layer_name: ''
  //   };

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

  var getFeatureInfoParams = [
    "REQUEST=GetFeatureInfo", "SERVICE=WMS", "VERSION=1.1.1", "FEATURE_COUNT=10", "INFO_FORMAT=application/json", "EXCEPTIONS=application%2Fvnd.ogc.se_xml"
  ];

  $scope.search = function() {
    $scope.results = [];
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

    console.log('Searching ' + $scope.place.formatted_address);
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
      var source = $scope.sources[i];
      console.log("source.name=" + source.name);
      console.log('wms url=' +source.wms_url);

      if (source.wms_url === undefined)
      {
        console.log('ignoring undefined source.wms_url');
        break;
      }

      var url = source.wms_url + "?" + getFeatureInfoParams.join("&");
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
      if (data.type !== "FeatureCollection") {
        console.log('Ignoring non-GetFeatureInfo response');
        return;
      }

      if (data.features.length === 0)
      {
        console.log('Response contained no features');
        return;
      }

      console.log('GetFeatureInfo OK ' + source.name);

      $scope.results[$scope.results.length] = {
        source: source,
        features: data.features
      };
    };
  };
});
