export const ADD_STORE = "ADD_STORE";
export const LOADING = "LOADING";

export const addStore = (data) => ({
    type: ADD_STORE,
    payload: data,
  });

export const setPageLoading = (data) => ({
  type: LOADING,
  payload: data.payload,
})