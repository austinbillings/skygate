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