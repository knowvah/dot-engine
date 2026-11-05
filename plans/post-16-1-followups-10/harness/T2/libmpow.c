// SPDX-License-Identifier: EPL-2.0
// Scratch Node-API addon: exposes the platform's libm pow to JS so the port can
// run with the exact bits the native oracle sees at every pow call.
#include <math.h>
#include <node_api.h>
static napi_value P(napi_env e, napi_callback_info i){
  size_t c=2; napi_value a[2], r; double x,y;
  napi_get_cb_info(e,i,&c,a,0,0);
  napi_get_value_double(e,a[0],&x); napi_get_value_double(e,a[1],&y);
  volatile double vx=x, vy=y;
  napi_create_double(e,pow(vx,vy),&r); return r;
}
NAPI_MODULE_INIT(){ napi_value f; napi_create_function(env,"pow",NAPI_AUTO_LENGTH,P,0,&f); napi_set_named_property(env,exports,"pow",f); return exports; }
