using System;
using System.Collections;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class PaypalSuccess : System.Web.UI.Page
{
    string PaypalID = string.Empty;
    string Token = string.Empty;
    string PayerID = string.Empty;
    string PaidOn = string.Empty;
    string Status = string.Empty;
    string StatusCode = string.Empty;
    string StatusDescription = string.Empty;
    string PaidAmount = string.Empty;
    string GuID = string.Empty;
    string PaymentID= string.Empty;
    string ProjectID = string.Empty;
    string PaymentMethod = string.Empty;
    protected void Page_Load(object sender, EventArgs e)
    {
        ArrayList obj = new ArrayList();
        obj = Session["CartDetail"] != null ? (ArrayList)Session["CartDetail"] : null;
        PayPal.Api.Amount amt = new PayPal.Api.Amount();
        var d = obj[1];
        amt = (PayPal.Api.Amount)d;
        var res = Request.RequestContext;
        var resObj = res.HttpContext.Response;

        PaymentMethod="1";
        PayerID = Request.Params["PayerID"];
        PaypalID = Request.Params["paymentId"];
        Token = Request.Params["token"];
        PaidOn = Request.ClientCertificate["validfrom"];
        StatusCode = resObj.Status;
        StatusDescription= resObj.StatusDescription;
        PaidAmount=amt.total;
        GuID= Request.Params["guid"];
        PaymentID = Session["paymentID"].ToString();
        ProjectID = Session["ProjectID"].ToString();
        if (StatusCode == "200 OK" || StatusCode == "201 Created")
        {
            Status="1";
        }
        else if(StatusCode == "202 Accepted" || StatusCode == "204 No Content")
        {
            Status="1";
        }
        else
        {
            Status="0";
        }

        SaveDataToPaypalLog();
    }
    void SaveDataToPaypalLog()
    {
        try 
        { 
        string ErrorIfAny = string.Empty;
        DataSet DS = new DataSet();
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "PaypalResponse @PaypalID,@Token,@PayerID,@PaidOn,@StatusCode,@StatusDescription,@PaidAmount,@GuID,@PaymentID,@Status,@ProjectID,@PaymentMethod";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("PaypalID", PaypalID));
                SqlParameters.Add(new SqlParameter("Token", Token));
                SqlParameters.Add(new SqlParameter("PayerID", PayerID));
                SqlParameters.Add(new SqlParameter("PaidOn", Convert.ToDateTime(PaidOn)));
                SqlParameters.Add(new SqlParameter("StatusCode", StatusCode));
                SqlParameters.Add(new SqlParameter("StatusDescription", StatusDescription));
                SqlParameters.Add(new SqlParameter("PaidAmount", PaidAmount));
                SqlParameters.Add(new SqlParameter("GuID", GuID));
                SqlParameters.Add(new SqlParameter("PaymentID", PaymentID));
                SqlParameters.Add(new SqlParameter("Status", Status));
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                SqlParameters.Add(new SqlParameter("PaymentMethod", PaymentMethod));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
                if (Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
                {

                }
            }

        }
        catch (Exception ex) { }
    }
}