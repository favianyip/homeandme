<%@ WebHandler Language="C#" Class="Webhook" %>

using System;
using System.Web;
using Stripe;
using System.IO;
using System.Net;
using System.Net.Mail;
using System.Data;
using System.Collections.Generic;
using System.Configuration;



public class Webhook : IHttpHandler
{
    public void ProcessRequest(HttpContext context)
    {
        //var endpointsecret = "whsec_pad1hAw9vHSWyjuez48yMkCCThEpe781";
        //var endpointsecret = "whsec_7117c02da11bcc011697387123c0528d79ea9d7557b74a067ea6233d8b372ebb";
        var endpointsecret = "whsec_kJzDGxaMeyveDqMBAiFjFQAjTYs3gyju";
        var json = new StreamReader(context.Request.InputStream).ReadToEnd();
        var signature = context.Request.Headers["Stripe-Signature"];
        LogFile("endpointsecret :" + endpointsecret + ",json:" + json + ",signature:" + signature + "", "Before Event Creation on Class");

        try
        {
            var stripeEvent = EventUtility.ParseEvent(json);
            LogFile(stripeEvent.ToString(), "After Parse");

            if (stripeEvent.Type == Events.CheckoutSessionCompleted)
            {
                LogFile(stripeEvent.ToString(), "Success section1");
                var session = stripeEvent.Data.Object as Stripe.Checkout.Session;
                var status = session.Status;
                var amount = session.AmountTotal / 100;
                var transid = session.PaymentIntentId;
                LogFile(Convert.ToString(transid), "Success section2");

                string Err = "";
                string Cmd = "INSERT INTO LogFile (ResponseValue) VALUES ('" + Tools.CompileSQL(session.ToString()) + "')";
                DataSet myds = new DataSet("myds");
                int stat = Tools.GetData(Cmd, out myds, out Err);

                Cmd = "UPDATE Payments SET PaymentMethod = 4, Status = 1, PaidOn = GETDATE(),IPN_Parameters =  'IPN_Verified_" + transid + "', PaidAmount =  '" + amount + "' WHERE TransactionID = '" + transid + "'";
                stat = Tools.GetData(Cmd, out myds, out Err);
                sendMail(Convert.ToString(transid));
                LogFile(Cmd, "Success section2");

                LogFile(Convert.ToString(transid), "Success section3");
                PaymentLog(Convert.ToString(transid), Convert.ToString(amount));
            }
            else if (stripeEvent.Type == Events.CheckoutSessionExpired)
            {
                LogFile(stripeEvent.ToString(), "Failed section");

                var session = stripeEvent.Data.Object as Stripe.Checkout.Session;
                var pstatus = session.Status;
                var pamount = session.AmountTotal / 100;
                var ptransid = session.PaymentIntentId;

                string Err = "";
                string Cmd = "INSERT INTO LogFile (ResponseValue) VALUES ('" + Tools.CompileSQL(pstatus) + "')";
                DataSet myds = new DataSet("myds");
                int stat = Tools.GetData(Cmd, out myds, out Err);

                Cmd = "UPDATE Payments SET IPN_Parameters =  'IPN_Verified_" + ptransid + "', PaidAmount =  '" + pamount + "' WHERE TransactionID = '" + ptransid + "'";
                stat = Tools.GetData(Cmd, out myds, out Err);
                PaymentLog(Convert.ToString(ptransid), Convert.ToString(pamount));
            }
        }
        catch (StripeException e)
        {
            LogFile(e.Message.ToString(), "ExpectionSection");
            Console.WriteLine(e);
            throw e;
        }
    }

    public bool IsReusable
    {
        get
        {
            return false;
        }
    }

    //Payment Success mail.
    protected void sendMail(string transactionID)
    {
        try
        {
            bool Val = false;
            string Err = "";
            string Cmd = "SELECT Payments.ProjectID AS OrderID, Payments.PaidAmount, " +
                            "Users.Name, CONVERT(varchar,Payments.PaidOn,106) AS PaidOn, Users.Email " +
                            "FROM Payments INNER JOIN Projects ON Projects.ProjectID = Payments.ProjectID " +
                            "INNER JOIN Users ON Users.UserID = Projects.UserID WHERE Payments.TransactionID ='" + transactionID + "'";
            DataSet ds = new DataSet("myds");
            LogFile(Cmd, "Mail Section1 " + transactionID);
            int stat = Tools.GetData(Cmd, out ds, out Err);
            if (Convert.ToInt32(ds.Tables[0].Rows.Count) > 0)
            {
                LogFile(Cmd, "Mail Section2");
                string Email = Convert.ToString(ds.Tables[0].Rows[0]["Email"]);
                string Name = Convert.ToString(ds.Tables[0].Rows[0]["Name"]);
                string OrderID = Convert.ToString(ds.Tables[0].Rows[0]["OrderID"]);
                string PaidOn = Convert.ToString(ds.Tables[0].Rows[0]["PaidOn"]);
                string PaidAmount = Convert.ToString(ds.Tables[0].Rows[0]["PaidAmount"]);
                if (Email.ToString() == "" || Email.ToString() == null)
                {
                    Val = false;
                }
                else
                {
                    Val = true;
                    string EmailSubject;
                    string EmailBody = Tools.GetEmailBody("Notification Order Confirmation", out EmailSubject);
                    EmailBody = EmailBody.Replace("[Name]", Name);
                    EmailBody = EmailBody.Replace("[OrderNumber]", OrderID);
                    EmailBody = EmailBody.Replace("[PaymentDate]", PaidOn);
                    EmailBody = EmailBody.Replace("[Amount]", PaidAmount);
                    EmailBody = EmailBody.Replace("[PaymentMethod]", "Online");
                    EmailBody = EmailBody.Replace("[Url]", ConfigurationManager.AppSettings["SiteUrl"].ToString());
                    List<string> AttachmentsUser = new List<string>();
                    Val = Tools.Pushmail(Email, EmailSubject, EmailBody, AttachmentsUser);
                    if (Val == true)
                    {
                        LogFile(Cmd, "Mail Section3");
                        Tools.EmailLogTrail(Email, EmailSubject, EmailBody, "", "");
                    }
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void LogFile(string ResponseValue, string type)
    {
        string Err1 = "";
        string Cmd1 = "INSERT INTO LogFile (ResponseValue,Type) VALUES ('" + ResponseValue + "','" + type + "')";
        DataSet myds1 = new DataSet("myds");
        int stat1 = Tools.GetData(Cmd1, out myds1, out Err1);
    }
    protected void PaymentLog(string transid, string amount)
    {
        string Err2 = "";
        string Cmd2 = "UPDATE PaymentLog SET PaymentMethod = 4, Status = 1, PaidOn = GETDATE(),IPN_Parameters =  'IPN_Verified_" + transid + "', PaidAmount =  '" + amount + "' WHERE TransactionID = '" + transid + "'";
        DataSet myds2 = new DataSet("myds");
        int stat2 = Tools.GetData(Cmd2, out myds2, out Err2);
    }
}