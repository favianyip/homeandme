using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Data;
using System.Data.SqlClient;
public partial class EmailConfiguration : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        try
        {
            Page.Title = Tools.GetConfigValue(Tools.KeyVariables.SiteTitle);
            lblMsg.Text = String.Empty;
            if (Session[Tools.SessionVariables.AdminUserID] == null)
            {
                Response.Redirect("Admin.aspx");
            }
            if (!IsPostBack)
            {
                ddlEmailOption.DataBind();
                ddlEmailOption.SelectedIndex = 0;
                updateValue();
            }
        }
        catch
        {

        }
    }

    protected void btnSave_Click(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "Update EmailConfig SET EmailValue = @EmailValue, Subject = @Subject Where EmailKey= @EmailKey";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("EmailValue", HttpUtility.HtmlEncode(fckEmail.Text.Trim())));
                SqlParameters.Add(new SqlParameter("Subject", txtSubject.Text.Trim()));
                SqlParameters.Add(new SqlParameter("EmailKey", ddlEmailOption.SelectedItem.Text));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                lblMsg.Text = "Updated Successfully!";
                Tools.AdminLogTrail(Session[Tools.SessionVariables.AdminUserID].ToString().Trim(), "Updated content for email: " + ddlEmailOption.SelectedItem.Text.Trim());
            }
            else
                lblMsg.Text = "Please try again";
        }
        catch (Exception eX) { }
    }

    protected void ddlEmailOption_SelectedIndexChanged(object sender, EventArgs e)
    {
        updateValue();
    }

    void updateValue()
    {
        try
        {
            string err = String.Empty;
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            DataSet ds = new DataSet("ds");
            string sub = String.Empty;
            string body = String.Empty;
            if (Convert.ToString(ddlEmailOption.SelectedItem.Value) != "")
            {
                SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "Select EmailValue, Subject FROM [EmailConfig] WHERE ItemID = @ItemID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ItemID", ddlEmailOption.SelectedItem.Value));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                ds = new DataSet("ds");
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    if (ds.Tables[0].Rows.Count > 0)
                    {
                        body = HttpUtility.HtmlDecode(ds.Tables[0].Rows[0]["EmailValue"].ToString().Trim());
                        sub = ds.Tables[0].Rows[0]["Subject"].ToString().Trim();
                    }
                }
                fckEmail.Text = body;
                txtSubject.Text = sub;
            }
        }
        catch (Exception eX) { }
    }

    protected void BtnCancel_Click(object sender, EventArgs e)
    {
        Response.Redirect("AdminDashboard.aspx");
    }

    protected void btnNew_Click(object sender, EventArgs e)
    {
        try
        {
            txtEmailTitle.Text = string.Empty;
            popupCreate.ShowOnPageLoad = true;
        }
        catch { }
    }
    protected void btnCreate_Click(object sender, EventArgs e)
    {
        try
        {
            string Title = string.Empty;
            int CreatedBy = 0;
            Title = txtEmailTitle.Text;
            CreatedBy = Convert.ToInt32(Session[Tools.SessionVariables.AdminUserID].ToString().Trim());
            if (Title == String.Empty)
            {
                throw new Exception("EMail Title is mandatory.");
            }
            string ErrorIfAny = string.Empty;
            DataSet DS = new DataSet("DS");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "CreateEmailConfig @EmailKey";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("EmailKey", Title));

            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception("Error encountered, please try again later.");
            }
            else
            {
                string EmailConfigID = string.Empty;
                if (DS.Tables.Count > 0)
                {
                    if (DS.Tables[0].Rows.Count > 0)
                    {
                        EmailConfigID = DS.Tables[0].Rows[0]["EmailConfigID"].ToString();
                        popupCreate.ShowOnPageLoad = false;
                        ddlEmailOption.DataBind();
                        ddlEmailOption.Value = EmailConfigID;
                        updateValue();
                    }
                }
            }
        }
        catch { }
    }

    protected void btnCreateCancel_Click(object sender, EventArgs e)
    {
        try
        {
            popupCreate.ShowOnPageLoad = false;

        }
        catch { }
    }

}