using System;
using System.Web;
using Stripe;
using System.IO;
using System.Net;
using System.Net.Mail;
using System.Data;


public partial class Api_StripePayementReview : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        try
        {
            StripePayment stripePayment = new StripePayment();
            stripePayment.payment();
            LogFile();
        }
        catch (Exception eX) { }
    }

    protected void LogFile()
    {
        string Err1 = "";
        string Cmd1 = "INSERT INTO LogFile (ResponseValue,Type) VALUES ('PAGE','StripePaymentReview')";
        DataSet myds1 = new DataSet("myds");
        int stat1 = Tools.GetData(Cmd1, out myds1, out Err1);
    }
}