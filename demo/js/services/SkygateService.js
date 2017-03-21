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
  
  service.actions.login = (input) => {
    Robin.loading(true);
    $http.post(endpoint, input)
      .then(res => {
        Robin.loading(false);
        service.user = res.data.user;
      })
      .catch(e => errHandler(e));
  }
  
  service.actions.refresh = () => {
    $http.get(endpoint)
      .then(res => {
        service.user = res.data.user;
      })
      .catch(e => errHandler(e));
  }
  
  service.actions.logout = () => {
    Robin.loading(true);
    $http.delete(endpoint)
      .then(res => {
        Robin.loading(false);
        Robin.alert('Successfully logged out.');
        service.user = res.data.user;
      })
      .catch(e => errHandler(e));
  }
  
  service.actions.refresh();
  
  return service;
});