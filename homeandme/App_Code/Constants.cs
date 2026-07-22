public class Constants
{
    /// <summary>
    /// Modify these values if you want to use your own profile.
    /// </summary>

    /* 
     *                                                                         *
     * WARNING: Do not embed plaintext credentials in your application code.   *
     * Doing so is insecure and against best practices.                        *
     *                                                                         *
     * Your API credentials must be handled securely. Please consider          *
     * encrypting them for use in any production environment, and ensure       *
     * that only authorized individuals may view or modify them.               *
     *                                                                         *
     */

    public const string ENVIRONMENT = "sandbox";
    public const string PAYPAL_URL = "https://www.sandbox.paypal.com";
    public const string ECURLLOGIN = "https://developer.paypal.com";
    public const string SUBJECT = "";

    public const string PROFILE_KEY = "Profile";
    public const string PAYMENT_ACTION_PARAM = "paymentAction";
    public const string PAYMENT_TYPE_PARAM = "paymentType";

    public const string STANDARD_EMAIL_ADDRESS = "hnm@stratagile.com";
    public const string WEBSCR_URL = PAYPAL_URL + "/cgi-bin/webscr";

    ///sandbox 3t credentials
    public const string PRIVATE_KEY_PASSWORD = "";
    public const string API_USERNAME = "hnm_api2.stratagile.com";
    public const string API_PASSWORD = "9FFJJ65XHBPY97C3";
    public const string API_SIGNATURE = "ArDzu3xjRsXiHgCFnM.k5oOMCnMzA5I9KMBSdfV9ErmWp1XxfH6HIsDK";
    public const string CERTIFICATE = "";

    //Permission
    public const string OAUTH_SIGNATURE = "";
    public const string OAUTH_TOKEN = "";
    public const string OAUTH_TIMESTAMP = "";

}