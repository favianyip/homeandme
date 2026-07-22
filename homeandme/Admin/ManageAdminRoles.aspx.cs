using DevExpress.Web;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin_ManageAdminRoles : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {

    }

    protected void btnCancel_Click(object sender, EventArgs e)
    {
        try
        {
            divRoleForm.Visible = false;
            divRoleGrid.Visible = true;
        }
        catch (Exception eX) { }
    }

    protected void btnRoleCreate_Click(object sender, EventArgs e)
    {
        divRoleForm.Visible = true;
        divRoleGrid.Visible = false;
    }

    protected void btnSaveRole_Click(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "INSERT INTO Roles(Role)VALUES(@Role)";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("Role", txtRole.Text.Trim()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            DataSet ds = new DataSet("ds");
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                divRoleForm.Visible = false;
                divRoleGrid.Visible = true;
                txtRole.Text = String.Empty;
                GridRoles.DataBind();
                btnRoleCreate.Visible = true;
            }
        }
        catch (Exception eX) { }
    }

    protected void Viewable_CheckedChanged(object sender, EventArgs e)
    {
        try
        {
            ASPxCheckBox chkViewable = (ASPxCheckBox)sender;
            var MenuID = chkViewable.Attributes["CommandArgument"];
            bool check = chkViewable.Checked;
            int checkstatus = 0;
            if (check)
            {
                checkstatus = 1;
            }
            else
            {
                checkstatus = 0;
            }
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "AddUpdateRolePermissions @RoleID,@MenuID,@Value,@EditORView";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("RoleID", hdnRoleID.Value));
                SqlParameters.Add(new SqlParameter("MenuID", MenuID));
                SqlParameters.Add(new SqlParameter("Value", checkstatus));
                SqlParameters.Add(new SqlParameter("EditORView", "0"));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.ExecuteSQL(SQLCommands, out err))
            {
                GridPermission.DataBind();
            }
        }
        catch (Exception eX) { }
    }

    protected void btnGoBack_Click(object sender, EventArgs e)
    {
        divRoleGrid.Visible = true;
        divMenu.Visible = false;
        btnRoleCreate.Visible = true;
    }

    protected void lnkEdit_Click(object sender, EventArgs e)
    {
        try
        {
            btnRoleCreate.Visible = false;
            string id = ((LinkButton)sender).CommandArgument;
            hdnRoleID.Value = id;
            divRoleGrid.Visible = false;
            divMenu.Visible = true;
        }
        catch (Exception eX) { }
    }
}