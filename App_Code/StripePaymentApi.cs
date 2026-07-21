using Stripe;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Services;
using Stripe.Checkout;


/// <summary>
/// Summary description for StripePaymentApi
/// </summary>
[WebService(Namespace = "http://hnmv2.strat-staging.com/")]
[WebServiceBinding(ConformsTo = WsiProfiles.BasicProfile1_1)]
// To allow this Web Service to be called from script, using ASP.NET AJAX, uncomment the following line. 
// [System.Web.Script.Services.ScriptService]
public class StripePaymentApi : System.Web.Services.WebService
{

    public StripePaymentApi()
    {

        //Uncomment the following line if using designed components 
        //InitializeComponent(); 
    }

    [WebMethod]
    public void StripePayment()
    {
        try
        {
            LogFile("class top", "class top");
            var endpointsecret = "whsec_PhSjJwSFP9dJM34sec59edQi80cHUtil";
            var json = new StreamReader(HttpContext.Current.Request.InputStream).ReadToEnd();
            var signature = HttpContext.Current.Request.Headers["Stripe-Signature"];
            LogFile("endpointsecret :" + endpointsecret + ",json:" + json + ",signature:" + signature + "", "Before Event Creation on Class");

             var stripeEvent = EventUtility.ConstructEvent(
                json,
                signature,
                endpointsecret
            );

           LogFile(stripeEvent.ToString(), "After Event Creation on Class");

            //string Err1 = "";
            //string Cmd1 = "INSERT INTO LogFile (ResponseValue) VALUES ('" + Tools.CompileSQL(stripeEvent.ToString()) + "')";
            //DataSet myds1 = new DataSet("myds");
            //int stat1 = Tools.GetData(Cmd1, out myds1, out Err1);

            //LogFile(stripeEvent.Type, "After Event Creation on Class");

            
            if (stripeEvent.Type == "checkout.session.completed" || stripeEvent.Type == "checkout.session.async_payment_succeeded" || stripeEvent.Type == "payment_intent.succeeded")
            {
                LogFile(stripeEvent.ToString(), "Success section1");
                var paymentIntent = stripeEvent.Data.Object as PaymentIntent;
                var email = paymentIntent.ReceiptEmail;
                var status = paymentIntent.Status;
                var amount = paymentIntent.Amount;
                var transid = paymentIntent.Id;

                LogFile(Convert.ToString(transid), "Success section2");

                string Err = "";
                string Cmd = "INSERT INTO LogFile (ResponseValue) VALUES ('" + Tools.CompileSQL(paymentIntent.ToString()) + "')";
                DataSet myds = new DataSet("myds");
                int stat = Tools.GetData(Cmd, out myds, out Err);

                Cmd = "UPDATE Payments SET PaymentMethod = 1, Status = 1, PaidOn = GETDATE(),IPN_Parameters =  'IPN_Verified_" + transid + "', PaidAmount =  '" + amount + "' WHERE TransactionID = '" + transid + "'";
                stat = Tools.GetData(Cmd, out myds, out Err);
                LogFile(Cmd, "Success section2");

                LogFile(Convert.ToString(transid), "Success section3");
            }
            else if (stripeEvent.Type == "checkout.session.async_payment_failed" || stripeEvent.Type == "checkout.session.expired")
            {
                LogFile(stripeEvent.ToString(), "Failed section");

                var paymentIntentFailed = stripeEvent.Data.Object as PaymentIntent;
                var pstatus = paymentIntentFailed.Status;
                var pamount = paymentIntentFailed.Amount;
                var ptransid = paymentIntentFailed.Id;

                string Err = "";
                DataSet ds = new DataSet("myds");
                string Cmd = "INSERT INTO LogFile (ResponseValue) VALUES ('" + Tools.CompileSQL(pstatus) + "')";
                int stat = Tools.GetData(Cmd, out ds, out Err);

                Cmd = "UPDATE Payments SET IPN_Parameters =  'IPN_Verified_" + ptransid + "', PaidAmount =  '" + pamount + "' WHERE TransactionID = '" + ptransid + "'";
                stat = Tools.GetData(Cmd, out ds, out Err);
            }
        }
        catch(Exception eX) { }
    }

    protected void LogFile(string ResponseValue, string type)
    {
        string Err1 = "";
        string Cmd1 = "INSERT INTO LogFile (ResponseValue,Type) VALUES ('" + ResponseValue + "','" + type + "')";
        DataSet myds1 = new DataSet("myds");
        int stat1 = Tools.GetData(Cmd1, out myds1, out Err1);
    }
}
