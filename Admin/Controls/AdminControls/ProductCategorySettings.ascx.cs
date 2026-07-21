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

public partial class Admin_Controls_AdminControls_ProductCategorySettings : System.Web.UI.UserControl
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if (!IsPostBack)
        {
            ReloadControl();
        }
    }

    public void ReloadControl()
    {
        try
        {

            cmbScopes.DataBind();
            cmbScopes.SelectedIndex = cmbScopes.Items.IndexOf(cmbScopes.Items.FindByValue(Convert.ToString("-1")));
            divGrid.Visible = false;
            GridCategory.DataBind();
        }
        catch (Exception eX) { }
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
                SQLContainer.Query = "get_OptionDetailsByScope @ScopeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                btnNewOption.Visible = true;
                hdnScope.Value = Convert.ToString(cmbScopes.SelectedItem.Value);
                divGrid.Visible = true;
                GridCategory.DataBind();
                if (Convert.ToString(cmbScopes.SelectedItem.Value) != "-1")
                {
                    lblError.Visible = false;
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void btnNewOption_Click(object sender, EventArgs e)
    {
        try
        {
            if (Convert.ToString(cmbScopes.SelectedItem.Value) == "-1")
            {
                lblError.Visible = true;
            }
            else
            {
                lblError.Visible = false;
                hdnOptionID.Value = "-1";
                divGrid.Visible = false;
                divEditCreate.Visible = true;
                btnNewOption.Visible = false;
                DivtopItems.Visible = false;
                OptionImage.ImageUrl = string.Empty;
            }
        }
        catch (Exception eX) { }
    }

    protected void btnEdit_Click(object sender, EventArgs e)
    {
        try
        {
            LinkButton btn = (LinkButton)sender;
            hdnOptionID.Value = btn.CommandArgument;
            divGrid.Visible = false;
            divEditCreate.Visible = true;
            btnNewOption.Visible = false;
            cmbScopes.Visible = false;
            lblWorkTypeText.Visible = false;
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM Options WHERE OptionID = @OptionID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("OptionID", hdnOptionID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                txtOption.Text = Convert.ToString(ds.Tables[0].Rows[0]["Option"]);
                cmbIsHidden.SelectedIndex = cmbIsHidden.Items.IndexOf(cmbIsHidden.Items.FindByValue(Convert.ToString(ds.Tables[0].Rows[0]["IsHidden"])));
                OptionImage.ImageUrl = Convert.ToString(ds.Tables[0].Rows[0]["ImageUrl"]);
                cmbSystemAddOn.SelectedIndex = cmbSystemAddOn.Items.IndexOf(cmbSystemAddOn.Items.FindByValue(Convert.ToString(ds.Tables[0].Rows[0]["SystemAddOn"])));
            }
        }
        catch (Exception eX) { }
    }

    protected void btnRemove_Click(object sender, EventArgs e)
    {
        try
        {
            LinkButton btn = (LinkButton)sender;
            hdnOptionID.Value = btn.CommandArgument;
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT IsHidden FROM Options WHERE OptionID = @OptionID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("OptionID", hdnOptionID.Value));
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

    protected void btnSave_Click(object sender, EventArgs e)
    {
        try
        {
            string ImageName = string.Empty;
            string ImageFileName = string.Empty;
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
                if (files.ContainsKey("OptionImage"))
                {
                    String NewFilePath = String.Empty;
                    string filePath = files["OptionImage"];
                    string BucketName = ConfigurationManager.AppSettings["S3BucketName"];
                    string FolderName = "project-hnm/Options/";
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
                Session.Remove("File");
            }
            if (hdnOptionID.Value == "-1")
            {
                string err = "";
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "AddOptions @Option,@ScopeID,@IsHidden,@ImageUrl,@SystemAddOn";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("Option", txtOption.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
                    SqlParameters.Add(new SqlParameter("IsHidden", cmbIsHidden.SelectedItem.Value));
                    if (Convert.ToString(ImageFileName) == "" || Convert.ToString(ImageFileName) == null)
                    {
                        SqlParameters.Add(new SqlParameter("ImageUrl", ""));
                    }
                    else
                    {
                        SqlParameters.Add(new SqlParameter("ImageUrl", ImageFileName.ToString()));
                    }
                    SqlParameters.Add(new SqlParameter("SystemAddOn", cmbSystemAddOn.SelectedItem.Value));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    string Serr = "";
                    DataSet Sds = new DataSet("ds");
                    List<Tools.SqlContainer> SSQLCommands = new List<Tools.SqlContainer>();
                    {
                        Tools.SqlContainer SSQLContainer = new Tools.SqlContainer();
                        SSQLContainer.Query = "AddSubOptionByOption @OptionID";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("OptionID", ds.Tables[0].Rows[0]["OptionID"]));
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
                                    divEditCreate.Visible = false;
                                    cmbScopes.Visible = true;
                                    lblWorkTypeText.Visible = true;
                                    cmbScopes.SelectedItem.Value = hdnScope.Value;
                                    divGrid.Visible = true;
                                    GridCategory.DataBind();
                                    DivtopItems.Visible = true;
                                    btnNewOption.Visible = true;
                                }
                            }
                        }
                    }
                }
            }
            else
            {
                string err = "";
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    if (Convert.ToString(ImageFileName) == "" || Convert.ToString(ImageFileName) == null)
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "UPDATE Options SET [Option]=@Option, ScopeID=@ScopeID, IsHidden=@IsHidden, SystemAddOn=@SystemAddOn WHERE OptionID = @OptionID";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("Option", txtOption.Text.Trim()));
                        SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
                        SqlParameters.Add(new SqlParameter("IsHidden", cmbIsHidden.SelectedItem.Value));
                        SqlParameters.Add(new SqlParameter("SystemAddOn", cmbSystemAddOn.SelectedItem.Value));
                        SqlParameters.Add(new SqlParameter("OptionID", hdnOptionID.Value));
                        SQLContainer.SqlParameters = SqlParameters;
                        SQLCommands.Add(SQLContainer);
                    }
                    else
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "UPDATE Options SET [Option]=@Option, ScopeID=@ScopeID, IsHidden=@IsHidden, ImageUrl=@ImageUrl, SystemAddOn=@SystemAddOn WHERE OptionID = @OptionID";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("Option", txtOption.Text.Trim()));
                        SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
                        SqlParameters.Add(new SqlParameter("IsHidden", cmbIsHidden.SelectedItem.Value));
                        SqlParameters.Add(new SqlParameter("ImageUrl", ImageFileName.ToString()));
                        SqlParameters.Add(new SqlParameter("SystemAddOn", cmbSystemAddOn.SelectedItem.Value));
                        SqlParameters.Add(new SqlParameter("OptionID", hdnOptionID.Value));
                        SQLContainer.SqlParameters = SqlParameters;
                        SQLCommands.Add(SQLContainer);
                    }
                }
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    divEditCreate.Visible = false;
                    cmbScopes.Visible = true;
                    lblWorkTypeText.Visible = true;
                    cmbScopes.DataBind();
                    cmbScopes.SelectedIndex = cmbScopes.Items.IndexOf(cmbScopes.Items.FindByValue(Convert.ToString(hdnScope.Value)));
                    divGrid.Visible = true;
                    GridCategory.DataBind();
                    txtOption.Text = String.Empty;
                    DivtopItems.Visible = true;
                    btnNewOption.Visible = true;
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void btnCancel_Click(object sender, EventArgs e)
    {
        try
        {
            txtOption.Text = String.Empty;
            cmbScopes.DataBind();
            cmbScopes.SelectedIndex = cmbScopes.Items.IndexOf(cmbScopes.Items.FindByValue(Convert.ToString(hdnScope.Value)));
            divGrid.Visible = true;
            GridCategory.DataBind();
            DivtopItems.Visible = true;
            divEditCreate.Visible = false;
            btnNewOption.Visible = true;
            cmbScopes.Visible = true;
            lblWorkTypeText.Visible = true;
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
                SQLContainer.Query = "UPDATE Options SET IsHidden = @IsHidden WHERE OptionID=@OptionID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                if (hdnIsHidden.Value == "0")
                {
                    SqlParameters.Add(new SqlParameter("IsHidden", "1"));
                }
                else
                {
                    SqlParameters.Add(new SqlParameter("IsHidden", "0"));
                }
                SqlParameters.Add(new SqlParameter("OptionID", hdnOptionID.Value));

                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                PopDelete.ShowOnPageLoad = false;
                GridCategory.DataBind();
            }
        }
        catch (Exception eX) { }
    }

    protected void BtnRemoveCancel_Click(object sender, EventArgs e)
    {
        try
        {
            PopDelete.ShowOnPageLoad = false;
            GridCategory.DataBind();
        }
        catch (Exception eX) { }
    }
}