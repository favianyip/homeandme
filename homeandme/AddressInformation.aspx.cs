using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class AddressInformation : System.Web.UI.Page
{
    string ErrorIfAny = String.Empty;
    string UserID = String.Empty;
    string ProjectID = String.Empty;

    protected void Page_Load(object sender, EventArgs e)
    {
        try
        {
            if (Session["UserID"] != null && Session["UserID"] != "")
            {
                UserID = Session["UserID"].ToString();
            }
            else
            {
                Response.Redirect("/Home.aspx");
            }
            if (Session["ProjectID"] != null)
            {
                ProjectID = Session["ProjectID"].ToString();
            }
            if (!IsPostBack)
            {
                GetAddressDetails(ProjectID);
                lblMsg.Text = String.Empty;
            }
        }
        catch (Exception ex) { }
    }

    void GetAddressDetails(string ProjectID)
    {
        DataSet ds = new DataSet("ds");
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "GetProjectDetails @ProjectID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
        {
            if (ds.Tables[0].Rows.Count > 0)
            {
                txtSiteAdddressName.Text = ds.Tables[0].Rows[0]["SiteAddressName"].ToString();
                txtSiteAddressMobile.Text = ds.Tables[0].Rows[0]["SiteAddressMobile"].ToString();
                txtSiteAddressZipCode.Text = ds.Tables[0].Rows[0]["SitePostalcode"].ToString();
                txtSiteAddress1.Text = ds.Tables[0].Rows[0]["SiteAddress1"].ToString();
                txtSiteAddress2.Text = ds.Tables[0].Rows[0]["SiteAddress2"].ToString();
                txtSiteAddressState.Text = ds.Tables[0].Rows[0]["SiteAddressState"].ToString();
                txtSiteAddressCountry.Text = ds.Tables[0].Rows[0]["SiteAddressCountry"].ToString();
                txtBillingAddressName.Text = ds.Tables[0].Rows[0]["BillingAddressName"].ToString();
                txtBillingAddressMobile.Text = ds.Tables[0].Rows[0]["BillingAddressMobile"].ToString();
                txtBillingAddressZipCode.Text = ds.Tables[0].Rows[0]["BillingAddressPostCode"].ToString();
                txtBillingAddress1.Text = ds.Tables[0].Rows[0]["BillingAddress1"].ToString();
                txtBillingAddress2.Text = ds.Tables[0].Rows[0]["BillingAddress2"].ToString();
                txtBillingAddressState.Text = ds.Tables[0].Rows[0]["BillingAddressState"].ToString();
                txtBillingAddressCountry.Text = ds.Tables[0].Rows[0]["BillingAddressCountry"].ToString();
                if (txtSiteAdddressName.Text == txtBillingAddressName.Text && txtSiteAddressZipCode.Text == txtBillingAddressZipCode.Text
                    && txtSiteAddressMobile.Text == txtBillingAddressMobile.Text && txtSiteAddress1.Text == txtBillingAddress1.Text
                    && txtSiteAddress2.Text == txtBillingAddress2.Text && txtSiteAddressState.Text == txtBillingAddressState.Text
                    && txtSiteAddressCountry.Text == txtBillingAddressCountry.Text)
                { chkIsSameAddress.Checked = true; }
            }
        }
    }

    protected void chkIsSameAddress_CheckedChanged(object sender, EventArgs e)
    {
        try
        {
            if (chkIsSameAddress.Checked == true)
            {
                txtBillingAddressName.Text = txtSiteAdddressName.Text;
                txtBillingAddressMobile.Text = txtSiteAddressMobile.Text;
                txtBillingAddressZipCode.Text = txtSiteAddressZipCode.Text;
                txtBillingAddress1.Text = txtSiteAddress1.Text;
                txtBillingAddress2.Text = txtSiteAddress2.Text;
                txtBillingAddressState.Text = txtSiteAddressState.Text;
                txtBillingAddressCountry.Text = txtSiteAddressCountry.Text;
            }
            else
            {
                txtBillingAddressName.Text = String.Empty;
                txtBillingAddressMobile.Text = String.Empty;
                txtBillingAddressZipCode.Text = String.Empty;
                txtBillingAddress1.Text = String.Empty;
                txtBillingAddress2.Text = String.Empty;
                txtBillingAddressState.Text = String.Empty;
                txtBillingAddressCountry.Text = String.Empty;
            }
        }
        catch (Exception ex) { }
    }

    protected void btnSaveAddress_Click(object sender, EventArgs e)
    {
        try
        {
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "UpdateAddressForProject @ProjectID, @SiteAddressName, @SiteAddressMobile, @SiteAddressZipCode, @SiteAddress1, @SiteAddress2," +
                                     "@SiteAddressState, @SiteAddressCountry, @BillingAddressName, @BillingAddressMobile, @BillingAddressZipCode, @BillingAddress1," +
                                     "@BillingAddress2, @BillingAddressState, @BillingAddressCountry";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                SqlParameters.Add(new SqlParameter("SiteAddressName", txtSiteAdddressName.Text.Trim()));
                SqlParameters.Add(new SqlParameter("SiteAddressMobile", txtSiteAddressMobile.Text.Trim()));
                SqlParameters.Add(new SqlParameter("SiteAddressZipCode", txtSiteAddressZipCode.Text.Trim()));
                SqlParameters.Add(new SqlParameter("SiteAddress1", txtSiteAddress1.Text.Trim()));
                SqlParameters.Add(new SqlParameter("SiteAddress2", txtSiteAddress2.Text.Trim()));
                SqlParameters.Add(new SqlParameter("SiteAddressState", txtSiteAddressState.Text.Trim()));
                SqlParameters.Add(new SqlParameter("SiteAddressCountry", txtSiteAddressCountry.Text.Trim()));
                SqlParameters.Add(new SqlParameter("BillingAddressName", txtBillingAddressName.Text.Trim()));
                SqlParameters.Add(new SqlParameter("BillingAddressMobile", txtBillingAddressMobile.Text.Trim()));
                SqlParameters.Add(new SqlParameter("BillingAddressZipCode", txtBillingAddressZipCode.Text.Trim()));
                SqlParameters.Add(new SqlParameter("BillingAddress1", txtBillingAddress1.Text.Trim()));
                SqlParameters.Add(new SqlParameter("BillingAddress2", txtBillingAddress2.Text.Trim()));
                SqlParameters.Add(new SqlParameter("BillingAddressState", txtBillingAddressState.Text.Trim()));
                SqlParameters.Add(new SqlParameter("BillingAddressCountry", txtBillingAddressCountry.Text.Trim()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                lblMsg.Text = "Address saved successfully.";
            }
            else
            {
                lblMsg.Text = "Error found.Please try again!";
            }
        }
        catch (Exception ex) { }
    }
}