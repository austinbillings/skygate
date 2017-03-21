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