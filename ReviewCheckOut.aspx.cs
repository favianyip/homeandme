using Stripe;
using Stripe.Checkout;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;
using DevExpress.Web;
using iTextSharp.text;
using iTextSharp.text.html.simpleparser;
using iTextSharp.text.pdf;


public partial class ReviewCheckOut : System.Web.UI.Page
{
    public string sessionId = "";
    public string paymentId = "";
    public string clientreferenceid = "";
    public string customerid = "";

    protected void Page_Load(object sender, EventArgs e)
    {
        Session.Add("filename", Session["ProjectID"].ToString() + ".txt");
        string PaymentCost = Convert.ToString(Request.QueryString["PaymentCost"]);
        decimal pCost = Convert.ToDecimal(PaymentCost);
        pCost = pCost * 100;
        //StripeConfiguration.ApiKey = "sk_test_51KlWhcSCaeHy33qNo9cJRYMdnGl7whj6PeZQnvorSdfrsHXkKX5gRNmXsNatQERBYVZVs4BbfnlOQc0sTRoaZ6Kh003f7NV5Ck";
        StripeConfiguration.ApiKey = "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";
       var options = new SessionCreateOptions
        {
            SuccessUrl = ConfigurationManager.AppSettings["SiteUrl"] + "SuccessCheckOutStripe.aspx?id={CHECKOUT_SESSION_ID}",
            CancelUrl = ConfigurationManager.AppSettings["SiteUrl"] + "CheckOutCancel.aspx",

            PaymentMethodTypes = new List<string> {
                    "card",
                },
            LineItems = new List<SessionLineItemOptions>
                    {
                    new SessionLineItemOptions
                        {
                            Name="Project",
                            Amount=Convert.ToInt32(pCost),
                            Currency="SGD",
                            Quantity = 1,
                            Description="payment",
                        },
                    }
        };
        var service = new SessionService();
        Session session = service.Create(options);
        sessionId = session.Id;
        paymentId = session.PaymentIntentId;
        clientreferenceid = session.ClientReferenceId;
        customerid = session.CustomerId;

        string Err = String.Empty;
        DataSet myds = new DataSet("myds");
        string Cmd = "INSERT INTO Payments (PaymentMethod, TypeOfPayment, PaidOn,Status, IPN_Parameters, TransactionID,PaidAmount,ProjectID,StripeClientReferenceID,StripeCustomerID ) VALUES (4, 1, GETDATE(),0, 'IPN_Verified_" + session.ToString() + "', '" + paymentId + "','" + PaymentCost + "', "
                            + "'" + Session["ProjectID"] + "', '" + clientreferenceid + "', '" + customerid + "')";
        int stat = Tools.GetData(Cmd, out myds, out Err);

        LogFile(Convert.ToString(paymentId), "Review CheckOutpage");
        PaymentLog();
        if (sessionId.Equals(""))
        {
            Response.Write("<script>alert('Error To Create Session ')</script>");
        }
    }

    protected void LogFile(string ResponseValue, string type)
    {
        string Err1 = "";
        string Cmd1 = "INSERT INTO LogFile (ResponseValue,Type) VALUES ('" + ResponseValue + "','" + type + "')";
        DataSet myds1 = new DataSet("myds");
        int stat1 = Tools.GetData(Cmd1, out myds1, out Err1);
    }
    void PaymentLog()
    {
        string PaymentCost = Convert.ToString(Request.QueryString["PaymentCost"]);
        decimal pCost = Convert.ToDecimal(PaymentCost);
        pCost = pCost * 100;
        var options = new SessionCreateOptions
        {
            SuccessUrl = ConfigurationManager.AppSettings["SiteUrl"] + "SuccessCheckout.aspx?id={CHECKOUT_SESSION_ID}",
            CancelUrl = ConfigurationManager.AppSettings["SiteUrl"] + "CheckOutCancel.aspx",

            PaymentMethodTypes = new List<string> {
                    "card",
                },
            LineItems = new List<SessionLineItemOptions>
                    {
                    new SessionLineItemOptions
                        {
                            Name="Project",
                            Amount=Convert.ToInt32(pCost),
                            Currency="SGD",
                            Quantity = 1,
                            Description="payment",
                        },
                    }
        };
        var service = new SessionService();
        Session session = service.Create(options);
        string Err2 = "";
        string Cmd2 = "INSERT INTO PaymentLog ( PaidOn,PaidAmount, ProjectID,PaymentMethod,TransactionID,IPN_Parameters,Status) VALUES (GETDATE(),'" + PaymentCost + "'," + "'" + Session["ProjectID"] + "', 4 ,'" + paymentId + "','IPN_Verified_" + session.ToString() + "', 0)";
        DataSet myds2 = new DataSet("myds");
        int stat2 = Tools.GetData(Cmd2, out myds2, out Err2);
    }
}
