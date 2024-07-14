import moment from "moment";
export const checkIsUserPlanExpired = (expityDate) => {
  console.log(expityDate)
    const todaysDate = moment().format('DD/MM/YYYY');
    const currentDate =  moment(todaysDate, "DD/MM/YYYY");
    const expiryDate = moment(expityDate, "DD/MM/YYYY");
    return currentDate.isAfter(expiryDate);
  };