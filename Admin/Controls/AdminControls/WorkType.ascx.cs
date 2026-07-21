using Amazon.S3;
using Amazon.S3.Model;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin_Controls_AdminControls_WorkType : System.Web.UI.UserControl
{
    protected void Page_Load(object sender, EventArgs e)
    {
        ReloadControl();
        if (Session["File"] != null)
        {
            string ErrorIfAny = String.Empty;
            Dictionary<string, string> files = new Dictionary<string, string>();
            files = ((Dictionary<string, string>)Session["File"]);
            if (files.ContainsKey("ScopeImage"))
            {
                ScopeImage.Visible = false;
            }
        }
    }

    public void ReloadControl()
    {
        try
        {
            GridWorkTypes.DataBind();
        }
        catch (Exception eX) { }
    }

    private void ClearControls()
    {
        try
        {
            txtScope.Text = String.Empty;
            cmbIsHidden.SelectedIndex = cmbIsHidden.Items.IndexOf(cmbIsHidden.Items.FindByValue(Convert.ToString("0")));
            cmbType.SelectedIndex = cmbType.Items.IndexOf(cmbType.Items.FindByValue(Convert.ToString("-1")));
            cblFees.DataBind();
        }
        catch (Exception eX) { }
    }
    protected void btnSearch_Click(object sender, EventArgs e)
    {
        try
        {
            string SearchString = String.Empty;
            SearchString = "get_ScopesDetails " + "'" + txtSearch.Text + "'";
            WorkTypeSource.SelectCommand = SearchString;
            GridWorkTypes.DataBind();
        }
        catch (Exception eX) { }
    }

    protected void btnNew_Click(object sender, EventArgs e)
    {
        try
        {
            hdnScopeID.Value = "-1";
            DivtopItems.Visible = false;
            divGrid.Visible = false;
            divEditCreate.Visible = true;
            ScopeImage.ImageUrl = string.Empty;
        }
        catch (Exception eX) { }
    }

    protected void btnSave_Click(object sender, EventArgs e)
    {
        try
        {
            string ImageName = string.Empty;
            string ImageFileName = string.Empty;
            string ActiveImageFileName = string.Empty;
            Admin_Controls_AdminControls_ProductCategorySettings _ProductCategorySettings = new Admin_Controls_AdminControls_ProductCategorySettings();
            Admin_Controls_AdminControls_ProductSettings _ProductSettings = new Admin_Controls_AdminControls_ProductSettings();
            Admin_Controls_AdminControls_ProductSubOptionSettings _ProductSubOptionSettings = new Admin_Controls_AdminControls_ProductSubOptionSettings();
            Admin_Controls_AdminControls_ProductSubOptionLevel2 _ProductSubOptionLevel2 = new Admin_Controls_AdminControls_ProductSubOptionLevel2();
            Admin_Controls_AdminControls_ProductSubOptionLevel3 _ProductSubOptionLevel3 = new Admin_Controls_AdminControls_ProductSubOptionLevel3();
            string ImageFileID = "";
            if (Session["File"] != null)
            {
                string ErrorIfAny = String.Empty;
                Dictionary<string, string> files = new Dictionary<string, string>();
                files = ((Dictionary<string, string>)Session["File"]);
                if (files.ContainsKey("ScopeImage"))
                {
                    String NewFilePath = String.Empty;
                    string filePath = files["ScopeImage"];
                    string BucketName = ConfigurationManager.AppSettings["S3BucketName"];
                    string FolderName = "project-hnm/Scopes/";
                    ImageFileID = Tools.SaveImage(filePath, BucketName, FolderName, out ErrorIfAny);
                    string err = "";
                    DataSet ds = new DataSet("ds");
                    List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "SELECT * FROM Files WHERE FileID = @FileID";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("FileID", ImageFileID));
                        SQLContainer.SqlParameters = SqlParameters;
                        SQLCommands.Add(SQLContainer);
                    }
                    if (Tools.GetData(SQLCommands, out ds, out err))
                    {
                        if (ds.Tables[0].Rows.Count > 0)
                        {
                            ImageFileName = Convert.ToString(ds.Tables[0].Rows[0]["FilePathInServer"]);
                        }
                    }
                }
                if (files.ContainsKey("ActiveScopeImage"))
                {
                    String NewFilePath = String.Empty;
                    string filePath = files["ActiveScopeImage"];
                    string BucketName = ConfigurationManager.AppSettings["S3BucketName"];
                    string FolderName = "project-hnm/Scopes/";
                    ImageFileID = Tools.SaveImage(filePath, BucketName, FolderName, out ErrorIfAny);
                    string err = "";
                    DataSet ds = new DataSet("ds");
                    List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "SELECT * FROM Files WHERE FileID = @FileID";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("FileID", ImageFileID));
                        SQLContainer.SqlParameters = SqlParameters;
                        SQLCommands.Add(SQLContainer);
                    }
                    if (Tools.GetData(SQLCommands, out ds, out err))
                    {
                        if (ds.Tables[0].Rows.Count > 0)
                        {
                            ActiveImageFileName = Convert.ToString(ds.Tables[0].Rows[0]["FilePathInServer"]);
                        }
                    }
                }
                Session.Remove("File");
            }
            if (hdnScopeID.Value == "-1")
            {
                string err = "";
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "AddScopes @Scope,@ImageUrl,@ImageUrl2,@IsHidden,@Type";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("Scope", txtScope.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("ImageUrl", ImageFileName.ToString()));
                    SqlParameters.Add(new SqlParameter("ImageUrl2", ActiveImageFileName.ToString()));
                    SqlParameters.Add(new SqlParameter("IsHidden", cmbIsHidden.SelectedItem.Value));
                    SqlParameters.Add(new SqlParameter("Type", cmbType.SelectedItem.Value));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    FeeUpdateorInsert(Convert.ToString(ds.Tables[0].Rows[0]["ScopeID"]));
                    string Optionerr = "";
                    DataSet Optionds = new DataSet("ds");
                    List<Tools.SqlContainer> OptionSQLCommands = new List<Tools.SqlContainer>();
                    {
                        Tools.SqlContainer OptionSQLContainer = new Tools.SqlContainer();
                        OptionSQLContainer.Query = "AddOptionByScope @ScopeID";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("ScopeID", ds.Tables[0].Rows[0]["ScopeID"]));
                        OptionSQLContainer.SqlParameters = SqlParameters;
                        OptionSQLCommands.Add(OptionSQLContainer);
                    }
                    if (Tools.GetData(OptionSQLCommands, out Optionds, out Optionerr))
                    {
                        string Serr = "";
                        DataSet Sds = new DataSet("ds");
                        List<Tools.SqlContainer> SSQLCommands = new List<Tools.SqlContainer>();
                        {
                            Tools.SqlContainer SSQLContainer = new Tools.SqlContainer();
                            SSQLContainer.Query = "AddSubOptionByOption @OptionID";
                            List<SqlParameter> SqlParameters = new List<SqlParameter>();
                            SqlParameters.Add(new SqlParameter("OptionID", Optionds.Tables[0].Rows[0]["OptionID"]));
                            SSQLContainer.SqlParameters = SqlParameters;
                            SSQLCommands.Add(SSQLContainer);
                        }
                        if (Tools.GetData(SSQLCommands, out Sds, out Serr))
                        {
                            string SSerr = "";
                            DataSet SSds = new DataSet("ds");
                            List<Tools.SqlContainer> SSSQLCommands = new List<Tools.SqlContainer>();
                            {
                                Tools.SqlContainer SSSQLContainer = new Tools.SqlContainer();
                                SSSQLContainer.Query = "AddSubSubOptionBySubOption @SubOptionID";
                                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                                SqlParameters.Add(new SqlParameter("SubOptionID", Sds.Tables[0].Rows[0]["SubOptionID"]));
                                SSSQLContainer.SqlParameters = SqlParameters;
                                SSSQLCommands.Add(SSSQLContainer);
                            }
                            if (Tools.GetData(SSSQLCommands, out SSds, out SSerr))
                            {
                                string L2err = "";
                                DataSet L2ds = new DataSet("ds");
                                List<Tools.SqlContainer> L2SQLCommands = new List<Tools.SqlContainer>();
                                {
                                    Tools.SqlContainer L2SQLContainer = new Tools.SqlContainer();
                                    L2SQLContainer.Query = "AddSubSubOptionL2BySubSubOption @SubSubOptionID";
                                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                                    SqlParameters.Add(new SqlParameter("SubSubOptionID", SSds.Tables[0].Rows[0]["SubsubOptionID"]));
                                    L2SQLContainer.SqlParameters = SqlParameters;
                                    L2SQLCommands.Add(L2SQLContainer);
                                }
                                if (Tools.GetData(L2SQLCommands, out L2ds, out L2err))
                                {
                                    string L3err = "";
                                    DataSet L3ds = new DataSet("ds");
                                    List<Tools.SqlContainer> L3SQLCommands = new List<Tools.SqlContainer>();
                                    {
                                        Tools.SqlContainer L3SQLContainer = new Tools.SqlContainer();
                                        L3SQLContainer.Query = "AddSubSubOptionL3BySubSubOptionL2 @SubSubOptionL2ID";
                                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                                        SqlParameters.Add(new SqlParameter("SubSubOptionL2ID", L2ds.Tables[0].Rows[0]["SubsubOptionL2ID"]));
                                        L3SQLContainer.SqlParameters = SqlParameters;
                                        L3SQLCommands.Add(L3SQLContainer);
                                    }
                                    if (Tools.GetData(L3SQLCommands, out L3ds, out L3err))
                                    {
                                        GridWorkTypes.DataBind();
                                    }
                                }
                            }
                        }
                    }
                }
                DivtopItems.Visible = true;
                divGrid.Visible = true;
                divEditCreate.Visible = false;
                ClearControls();
                Response.Redirect(Request.RawUrl);
            }
            else
            {
                string err = "";
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "UpdateScopes @Scope, @ImageUrl1, @ImageUrl2, @IsHidden, @Type, @ScopeID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("Scope", txtScope.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("ImageUrl1", ImageFileName.ToString()));
                    SqlParameters.Add(new SqlParameter("ImageUrl2", ActiveImageFileName.ToString()));
                    SqlParameters.Add(new SqlParameter("IsHidden", cmbIsHidden.SelectedItem.Value));
                    SqlParameters.Add(new SqlParameter("Type", cmbType.SelectedItem.Value));
                    SqlParameters.Add(new SqlParameter("ScopeID", hdnScopeID.Value));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    GridWorkTypes.DataBind();
                    FeeUpdateorInsert(Convert.ToString(hdnScopeID.Value));
                }
                DivtopItems.Visible = true;
                divGrid.Visible = true;
                divEditCreate.Visible = false;
                ClearControls();
                Response.Redirect(Request.RawUrl);
            }
        }
        catch (Exception eX) { }
    }

    protected void FeeUpdateorInsert(string ScopeID)
    {
        try
        {
            string ErrorIfAny = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommand = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "DELETE FROM ApplicationFeeInScopes WHERE ScopeID = @ScopeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ScopeID", ScopeID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommand.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommand, out ds, out ErrorIfAny))
            {
                foreach (ListItem li in cblFees.Items)
                {
                    if (li.Selected)
                    {
                        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                        {
                            Tools.SqlContainer SQLContainers = new Tools.SqlContainer();
                            SQLContainers.Query = "INSERT INTO ApplicationFeeInScopes (ScopeID, ApplicationDetailID) " +
                                                    " VALUES (@ScopeID, @ApplicationDetailID)";
                            List<SqlParameter> SqlParameters = new List<SqlParameter>();
                            SqlParameters.Add(new SqlParameter("ScopeID", ScopeID));
                            SqlParameters.Add(new SqlParameter("ApplicationDetailID", li.Value.Trim()));
                            SQLContainers.SqlParameters = SqlParameters;
                            SQLCommands.Add(SQLContainers);
                        }
                        if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny)) { }
                    }
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void btnCancel_Click(object sender, EventArgs e)
    {
        try
        {
            ClearControls();
            GridWorkTypes.DataBind();
            DivtopItems.Visible = true;
            divGrid.Visible = true;
            divEditCreate.Visible = false;
        }
        catch (Exception eX) { }
    }

    protected void btnEdit_Click(object sender, EventArgs e)
    {
        try
        {
            LinkButton btn = (LinkButton)sender;
            hdnScopeID.Value = btn.CommandArgument;
            DivtopItems.Visible = false;
            divGrid.Visible = false;
            divEditCreate.Visible = true;
            ScopeImage.Visible = true;
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM Scopes WHERE ScopeID=@ScopeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ScopeID", hdnScopeID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                txtScope.Text = Convert.ToString(ds.Tables[0].Rows[0]["Scope"]);
                cmbIsHidden.SelectedIndex = cmbIsHidden.Items.IndexOf(cmbIsHidden.Items.FindByValue(Convert.ToString(ds.Tables[0].Rows[0]["IsHidden"])));
                cmbType.SelectedIndex = cmbType.Items.IndexOf(cmbType.Items.FindByValue(Convert.ToString(ds.Tables[0].Rows[0]["Type"])));
                ScopeImage.ImageUrl = Convert.ToString(ds.Tables[0].Rows[0]["ImageUrl"]);
                InactiveImageURL.ImageUrl = Convert.ToString(ds.Tables[0].Rows[0]["ImageUrl2"]);
                cblFees.DataBind();
                List<Tools.SqlContainer> SQLCommand = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "SELECT ApplicationDetailID From ApplicationFeeInScopes WHERE ScopeID = @ScopeID";
                    List<SqlParameter> SqlParameter = new List<SqlParameter>();
                    SqlParameter.Add(new SqlParameter("ScopeID", hdnScopeID.Value));
                    SQLContainer.SqlParameters = SqlParameter;
                    SQLCommand.Add(SQLContainer);
                }
                DataSet DS = new DataSet();
                if (Tools.GetData(SQLCommand, out DS, out err))
                {
                    cblFees.DataBind();
                    foreach (DataRow dr in DS.Tables[0].Rows)
                    {
                        foreach (ListItem li in cblFees.Items)
                        {
                            if (dr[0].ToString().Trim() == li.Value)
                            {
                                li.Selected = true;
                            }
                        }
                    }
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void btnRemove_Click(object sender, EventArgs e)
    {
        try
        {
            LinkButton btn = (LinkButton)sender;
            hdnScopeID.Value = btn.CommandArgument;
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT IsHidden FROM Scopes WHERE ScopeID=@ScopeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ScopeID", hdnScopeID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                if (Convert.ToString(ds.Tables[0].Rows[0]["IsHidden"]) == "0")
                {
                    hdnIsHidden.Value = "0";
                    litAlert.Text = "Please Click Confirm To Draft.";
                }
                else
                {
                    hdnIsHidden.Value = "1";
                    litAlert.Text = "Please Click Confirm To Active.";
                }
            }
            PopDelete.ShowOnPageLoad = true;
        }
        catch (Exception eX) { }
    }

    protected void BtnDelete_Click(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "UPDATE Scopes SET IsHidden = @IsHidden WHERE ScopeID=@ScopeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                if (hdnIsHidden.Value == "0")
                {
                    SqlParameters.Add(new SqlParameter("IsHidden", "1"));
                }
                else
                {
                    SqlParameters.Add(new SqlParameter("IsHidden", "0"));
                }
                SqlParameters.Add(new SqlParameter("ScopeID", hdnScopeID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                PopDelete.ShowOnPageLoad = false;
                GridWorkTypes.DataBind();
            }
        }
        catch (Exception eX) { }
    }

    protected void BtnRemoveCancel_Click(object sender, EventArgs e)
    {
        try
        {
            PopDelete.ShowOnPageLoad = false;
            GridWorkTypes.DataBind();
        }
        catch (Exception eX) { }
    }

}