var app = angular.module('datahereApp', ['ngAutocomplete']);

app.config(function($httpProvider) {
    //Enable cross domain calls
    $httpProvider.defaults.useXDomain = true;
});

app.controller('GFICtrl', function ($scope, $http) {
  $scope.result = '';
  $scope.options = null;
  $scope.place = '';

  $scope.sources = [
    {
      name: 'MyBroadband_GetFeatureInfo_38SydneyAv',
      dataset: '',
      wms_url: 'test/GetFeatureInfo_38SydneyAv.json',
      layer_name: '',
    }
    // {
    //   name: "MyBroadband",
    //   url_name: "mybroadband",
    //   wms_url: "https://www.mybroadband.communications.gov.au/geoserver/wms",
    //   layer_name: "DistributionArea"
    // }
  ];

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
    // console.log('searching lat=' + lat + ' lng=' + lng);

    var bounds = new google.maps.Circle({
      center: $scope.place.geometry.location,
      radius: 50.0
    }).getBounds();
    var minx = bounds.getSouthWest().lng();
    var miny = bounds.getSouthWest().lat();
    var maxx = bounds.getNorthEast().lng();
    var maxy = bounds.getNorthEast().lat();

    var bbox = minx + "," + miny + "," + maxx + "," + maxy;
    var width = document.getElementById('map-canvas').offsetWidth;
    var height = document.getElementById('map-canvas').offsetHeight;

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

      // $http.get(url).success($scope.onSearchSuccess);
      // $http.get(url)
      //   .success((function(name) {
      //     return function(data) {
      //       $scope.onSearchSuccess(name, data);
      //   };
      // })(source.name));
      $http.get(url)
        .success($scope.onSearchSuccess(source.name));
    }
  };

  $scope.onSearchSuccess = function (name) {
    return function(data) {
      // $scope.onSearchSuccess(name, data);
      console.log('onSearchSuccess');
      if (data.type !== "FeatureCollection") {
        console.log('Ignoring non-GetFeatureInfo response');
        return;
      }

      if (data.features.length === 0)
      {
        console.log('Response contained no features');
        return;
      }

      if (data.features.length > 1)
      {
        console.log('Response contained multiple features, using first.');
      }

      console.log('GetFeatureInfo OK');

      $scope.results[$scope.results.length] = {
        name: name,
        features: data.features
      };
    };
  };
});
