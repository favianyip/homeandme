using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.Text;
using System.Net;
using System.Web;
using System.Data;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Configuration;


public partial class PaymentSuccess : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        HttpWebRequest req = (HttpWebRequest)WebRequest.Create(Tools.GetConfigValue(Tools.KeyVariables.PayPalURL));

        req.Method = "POST";
        req.ContentType = "application/x-www-form-urlencoded";
        byte[] param = Request.BinaryRead(HttpContext.Current.Request.ContentLength);
        string strRequest = "?cmd=_notify-validate&" + Encoding.ASCII.GetString(param);
        req.ContentLength = strRequest.Length;


        string Err = "";
        string Cmd = "INSERT INTO LogFile (ResponseValue) VALUES ('" + Tools.CompileSQL(strRequest) + "')";
        DataSet myds = new DataSet("myds");       
        int stat = Tools.GetData(Cmd, out myds, out Err);
        StreamWriter streamOut = new StreamWriter(req.GetRequestStream(), System.Text.Encoding.ASCII);
        streamOut.Write(strRequest);
        streamOut.Close();
        StreamReader streamIn = new StreamReader(req.GetResponse().GetResponseStream());
        string strResponse = streamIn.ReadToEnd();
        streamIn.Close();
        Cmd = "INSERT INTO LogFile (ResponseValue) VALUES ('" + Tools.CompileSQL(strResponse) + "')";        
        stat = Tools.GetData(Cmd, out myds, out Err);


        if (Request["txn_id"].ToUpper().Trim() != "")
        {
            string transID = Request["txn_id"].ToUpper().Trim();
            string id = Request["item_number"].ToUpper().Trim();
            string type = Request["custom"].ToUpper().Trim();
            string amount = "";
            try
            {
                amount = Request["amt"].ToUpper().Trim();
            }
            catch (Exception) { }
            Cmd = "INSERT INTO Payments (PaymentMethod, PaidOn,Status, IPN_Parameters, TransationId,PaidAmount) VALUES (1, GETDATE(),1, 'IPN_Verified_" + transID + "', '" + transID + "','" + amount + "')";
            stat = Tools.GetData(Cmd, out myds, out Err);
           
        }
    }
    
}
