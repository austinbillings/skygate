angular.module('skygate-demo', ['ngAnimate', 'Hookup', 'Ringo', 'Robin', 'NE']);

angular.module('skygate-demo')
.controller('base', ['$scope', '$rootScope', '$http', '$log', '$sce', 'NorthEast', 'Robin', 'Ringo', 'SkygateService', function ($scope, $rootScope, $http, $log, $sce, NorthEast, Robin, Ringo, SkygateService) {
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
  $scope.skygate = SkygateService;
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
});
angular.module('skygate-demo').service('SkygateService', function (Robin, $http) {
  const endpoint = '/session';
  const service = {};
  
  service.user = {};

  service.loggedIn = () => {
    return service.user.id && service.user.email;
  }

  errHandler = (err) => {
    Robin.loading(false);
    let message = err.data && err.data.message ? err.data.message : err.message ? err.message : err.messageText ? err.messageText : 'A thing went wrong dude.';
    Robin.alert(message, { kind: 'warning', duration: 100 });
    console.log(err);
  }
  
  service.actions = {};
  
  service.login = (input) => {
    Robin.loading(true);
    $http.post(endpoint, input)
      .then(res => {
        Robin.loading(false);
        service.user = res.data.user;
      })
      .catch(e => errHandler(e));
  }
  
  service.refresh = () => {
    $http.get(endpoint)
      .then(res => {
        service.user = res.data.user;
      })
      .catch(e => errHandler(e));
  }
  
  service.logout = () => {
    Robin.loading(true);
    $http.delete(endpoint)
      .then(res => {
        Robin.loading(false);
        Robin.alert('Successfully logged out.');
        service.user = res.data.user;
      })
      .catch(e => errHandler(e));
  }
  
  service.refresh();
  
  return service;
});