// App Configuration - loaded from environment variables
export const variables = {
    deployedURL: process.env.REACT_APP_DEPLOYED_URL || 'https://cherishchow.vercel.app',
    isDeployed: process.env.REACT_APP_IS_DEPLOYED === 'true'
}

// EmailJS Configuration - loaded from environment variables for security
// These credentials should NEVER be hardcoded in production
const getEmailJsConfig = () => {
    const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    const userId = process.env.REACT_APP_EMAILJS_USER_ID;

    if (!serviceId || !userId) {
        console.warn('EmailJS credentials not configured. Email notifications will not work.');
    }

    return { serviceId, userId };
};

const emailJsConfig = getEmailJsConfig();

export const feedbackFormVariables = {
    serviceId: emailJsConfig.serviceId,
    templateId: process.env.REACT_APP_EMAILJS_FEEDBACK_TEMPLATE_ID,
    emailJsUserId: emailJsConfig.userId,
}

export const acceptOrderVariables = {
    serviceId: emailJsConfig.serviceId,
    templateId: process.env.REACT_APP_EMAILJS_ACCEPT_ORDER_TEMPLATE_ID,
    emailJsUserId: emailJsConfig.userId,
}