import { createStore, combineReducers } from 'redux';

import { loadingReducer, storeReducer } from '../src/reducers/storeReducer'

const rootReducer = combineReducers({
     storeReducer,
     loadingReducer
  });

const store = createStore(rootReducer,window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__());

export default store;
