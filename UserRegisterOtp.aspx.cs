using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class UserRegisterOtp : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {

    }

    protected void lnkSubmit_Click(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            string Name = string.Empty;
            string ContactNo = string.Empty;
            string UserID = string.Empty;
            string Email = string.Empty;
            string TempUserID = string.Empty;
            string cmd = "SELECT TempUserID,Otp, Name, ContactNumber, Email FROM TempUsers WHERE Otp='" + txtOtp.Text.Trim() + "' AND TempUserID ='" + Session["TempUserID"].ToString() + "'";
            DataSet ds = new DataSet("ds");
            int stat = Tools.GetData(cmd, out ds, out err);
            if (ds.Tables[0].Rows.Count > 0)
            {
                TempUserID = ds.Tables[0].Rows[0]["TempUserID"].ToString();
                UserID = RegisterNewUser(TempUserID);

                if (Convert.ToInt32(UserID) > 0)
                {
                    Session[Tools.SessionVariables.UserID] = Convert.ToString(UserID);
                    ProcessLogin(Convert.ToString(Session[Tools.SessionVariables.UserID]));
                }
            }
            else
            {
                ScriptManager.RegisterStartupScript(this.Page, this.GetType(), "script", "openMessageModal();", true);
                return;
            }
        }
        catch (Exception eX) { }
    }

    void ProcessLogin(string UserID)
    {
        try
        {
            string err = String.Empty;
            Session[Tools.SessionVariables.UserID] = UserID;
            string cmd = "INSERT INTO UserLogTrail (UserID, IPAddress) Values ('" + Session[Tools.SessionVariables.UserID].ToString().Trim() + "', '" + Tools.GetIP() + "')";
            int stat = Tools.ExecuteSQL(cmd, out err);
            StoreUserDetails(UserID);
        }
        catch (Exception eX) { }
    }

    void StoreUserDetails(string UserID)
    {
        string err = String.Empty;
        string cmd = "SELECT UserID,Name, Email FROM Users WHERE UserID='" + UserID + "'";
        DataSet ds = new DataSet("ds");
        int stat = Tools.GetData(cmd, out ds, out err);
        if (ds.Tables[0].Rows.Count > 0)
        {
            Session["UserName"] = ds.Tables[0].Rows[0]["Name"];
            Session["UserEmail"] = ds.Tables[0].Rows[0]["Email"];
            SendMail(Session["UserEmail"].ToString(), Session["UserName"].ToString());
            Response.Redirect("Home.aspx");
        }
    }

    void SendMail(string Email, string Name)
    {
        try
        {
            bool userVal = false;
            if (Email.ToString() == "" || Email.ToString() == null)
            {
                userVal = false;
            }
            else
            {
                userVal = true;
                string emailSubject = "";
                string emailBody = Tools.GetEmailBody("Facebook Registration", out emailSubject);
                emailBody = emailBody.Replace("[Name]", Name);
                List<string> attachments = new List<string>();
                userVal = Tools.Pushmail(Email, emailSubject, emailBody, attachments);
                if (userVal == true)
                {
                    Tools.EmailLogTrail(Email, emailSubject, emailBody, "", "");
                }
            }
        }
        catch (Exception eX) { }
    }

    private string RegisterNewUser(string TempUserID)
    {
        string ErrorIfAny = string.Empty;
        DataSet DS = new DataSet();
        string UserID = string.Empty;
        try
        {
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "RegisterNewUserFromTempUserID @TempUserID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("TempUserID", TempUserID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                if (DS.Tables[0].Rows[0]["UserID"].ToString() != string.Empty)
                {
                    UserID = DS.Tables[0].Rows[0]["UserID"].ToString();
                    Session["UserID"] = UserID;
                }
            }
        }
        catch { }
        return UserID;
    }
}