// src/reducers/cartReducer.js
import { ADD_STORE } from "../actions/storeAction.js";

const initialState = {
  store: [],
};

export const storeReducer = (state = initialState, action) => {
  switch (action.type) {
    case ADD_STORE:
      return {
        ...state,
        store: action.payload,
      };

    default:
      return state;
  }
};
