using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin_ManageProductsForPartner : System.Web.UI.Page
{
    string PartnerID = string.Empty;

    protected void Page_Load(object sender, EventArgs e)
    {
        try
        {
            if (Session["PartnerID"] == null)
            {
                Response.Redirect("/Admin/ManagePartners.aspx");
            }
            else
            {
                PartnerID = Session["PartnerID"].ToString();
                lblPartnerName.Text = Session["PartnerName"].ToString();
                if (!IsPostBack)
                {
                    ReloadControl();
                }
            }
        }
        catch (Exception ex)
        { }
    }

    public void ReloadControl()
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "LoadScopesForPartner @PartnerID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("PartnerID", PartnerID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                cmbScopes.DataSource = ds.Tables[0];
                cmbScopes.DataBind();
                cmbScopes.SelectedIndex = cmbScopes.Items.IndexOf(cmbScopes.Items.FindByValue(Convert.ToString("-1")));
            }
        }
        catch (Exception eX) { }
    }

    protected void btnRemove_Click(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            string ProductsForPartnerID = ((LinkButton)sender).CommandArgument;
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "DELETE FROM ProductsForPartner WHERE ProductsForPartnerID =  @ProductsForPartnerID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProductsForPartnerID", ProductsForPartnerID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.ExecuteSQL(SQLCommands, out err))
            {
                BindData();
            }
        }
        catch (Exception ex) { }
    }

    protected void BindData()
    {
        GridAssignedOptions.DataBind();
        GridOptions.DataBind();
    }

    protected void cmbScopes_SelectedIndexChanged(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "LoadOptionsByScopesForPartner @ScopeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                DivOptions.Visible = true;
                cmbOptions.DataSource = ds.Tables[0];
                cmbOptions.DataBind();
                cmbOptions.SelectedIndex = cmbOptions.Items.IndexOf(cmbOptions.Items.FindByValue(Convert.ToString(ds.Tables[0].Rows[0]["Option"])));
                Session["ScopeID"] = Convert.ToString(cmbScopes.SelectedItem.Value);
            }
        }
        catch (Exception eX) { }
    }

    protected void cmbOptions_SelectedIndexChanged(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetSubOptionListingByOptionsForPartner @ScopeID, @OptionID, @PartnerID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
                SqlParameters.Add(new SqlParameter("OptionID", cmbOptions.SelectedItem.Value));
                SqlParameters.Add(new SqlParameter("PartnerID", PartnerID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    divPartnerGrid.Visible = true;
                    lblMsg.Text = "";
                    Session["OptionID"] = Convert.ToString(cmbOptions.SelectedItem.Value);
                    GridOptions.DataBind();
                }
                else
                {
                    if (CheckAssignedTypesForPartners() == 0)
                    {
                        divPartnerGrid.Visible = false;
                        lblMsg.Text = "Work type already assigned to another partner";
                    }
                    else
                    {
                        divPartnerGrid.Visible = true;
                        lblMsg.Text = "";
                        Session["OptionID"] = Convert.ToString(cmbOptions.SelectedItem.Value);
                        GridOptions.DataBind();
                    }
                }
            }
        }
        catch (Exception eX) { }
    }

    int CheckAssignedTypesForPartners()
    {
        int IsHavingData = 0;
        string err = "";
        DataSet ds = new DataSet("ds");
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "GetPartnerProductListing @ScopeID, @OptionID, @PartnerID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
            SqlParameters.Add(new SqlParameter("OptionID", cmbOptions.SelectedItem.Value));
            SqlParameters.Add(new SqlParameter("PartnerID", PartnerID));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommands, out ds, out err))
        {
            if (ds.Tables[0].Rows.Count > 0)
            {
                IsHavingData = 1;
            }
        }
        return IsHavingData;
    }

    protected void btnAssign_Click(object sender, EventArgs e)
    {
        try
        {
            string ErrorIfAny = string.Empty;
            List<object> ids = new List<object>();
            ids = GridOptions.GetSelectedFieldValues("SubsubOptionL3ID");

            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            foreach (object id in ids)
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "InsertProductsForPartner @PartnerID, @SubsubOptionL3ID, @ScopeID, @OptionID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("PartnerID", PartnerID));
                SqlParameters.Add(new SqlParameter("SubsubOptionL3ID", id));
                SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
                SqlParameters.Add(new SqlParameter("OptionID", cmbOptions.SelectedItem.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.ExecuteSQL(SQLCommands, out ErrorIfAny))
            {
                lblMsg.Text = "Error while assigning the work type, please try again.";
            }
            else
            {
                lblMsg.Text = "";
                BindData();
                GridOptions.Selection.UnselectAll();
            }
        }
        catch (Exception eX) { }
    }
}