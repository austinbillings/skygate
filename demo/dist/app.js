angular.module('skygate-demo', ['ngAnimate', 'Hookup', 'Ringo', 'Robin', 'NE']);

angular.module('skygate-demo')
.controller('base', ['$scope', '$rootScope', '$http', '$log', '$sce', 'NorthEast', 'Robin', 'Ringo', function ($scope, $rootScope, $http, $log, $sce, NorthEast, Robin, Ringo) {
  // Site skinnin'
  Ringo.initialize({
    thickness: 5,
    size: 100
  });
  Robin.initialize(Robin.themes.plaque);
  Robin.initialize({
    color: 'white',
    accent: '#099490'
  });
  
  // boring stuff
  $scope.ne = NorthEast;
  $scope.robin = Robin;
  $scope.ui = {
    viewPrefix: ''
  };
  $scope.fa = function (icon) {
    return 'fa fa-' + icon;
  }
  $scope.template = function (name) {
    return $scope.ui.viewPrefix + '/html/templates/' + name + '.html';
  }
  $scope.view = function (name) {
    return $scope.ui.viewPrefix + '/html/views/' + name + '.html';
  }
  $scope.partial = function (name) {
    return $scope.ui.viewPrefix + '/html/partials/' + name + '.html';
  }
  $scope.slug = function (input) {
    return input.toLowerCase().replace(' ','-');
  }
  $scope.trust = function (html) {
    return $sce.trustAsHtml(html);
  }
  $scope.resource = function (url) {
    return $sce.trustAsResourceUrl(url);
  }
  $scope.bgi = function (image) {
    return 'url("' + image + '")';
  }
	$scope.useBgi = function (image) {
		return !image ? {} : {backgroundImage: $scope.bgi(image)};
	}
}]);

angular.module('skygate-demo').controller('loginController', function ($scope, $http, $timeout, Robin, Ringo, SkygateService) {
  let vm = this;
  vm.live = {
    id: null,
    pass: null,
    email: null
  }
  vm.submit = function () {
    SkygateService.actions.createSession(vm.live);
  }
});
angular.module('skygate-demo').service('SkygateService', function (Robin, $http) {
  const endpoint = '/session';
  
  let user = null;
  
  let errHandler = (err) => {
    Robin.loading(false);
    let message = err.data && err.data.message ? err.data.message : err.message ? err.message : err.messageText ? err.messageText : 'A thing went wrong dude.';
    Robin.notify(message, { kind: 'warning'});
    console.log(err);
  }
  
  let actions = {
    createSession (input) {
      Robin.loading(true);
      $http.post(endpoint, input)
        .then((res) => {
          Robin.loading(false);
          Robin.alert('Nice!');
          console.log(res.data);
        })
        .catch((e) => errHandler(e));
    }
  };
  
  return {
    endpoint,
    actions
  }
});