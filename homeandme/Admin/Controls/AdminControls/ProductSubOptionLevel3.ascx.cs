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

public partial class Admin_Controls_AdminControls_ProductSubOptionLevel3 : System.Web.UI.UserControl
{
    protected void Page_Load(object sender, EventArgs e)
    {
        //CheckSubsubOptionL2Exists();
        if (!IsPostBack)
        {
            ReloadControl();
        }
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
                SQLContainer.Query = "SELECT '-1' ScopeID, '...SELECT...' Scope  UNION SELECT ScopeID,Scope FROM Scopes ORDER BY Scope ASC";
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                cmbScopes.DataSource = ds.Tables[0];
                cmbScopes.DataBind();
                if (Convert.ToString(cmbScopes.SelectedItem.Value) == "-1")
                {
                    cmbCategory.DataSource = "";
                    cmbProducts.DataSource = "";
                    cmbProductsL1.DataSource = "";
                    cmbProductsL2.DataSource = "";
                    cmbCategory.SelectedItem = null;
                    cmbCategory.Text = "";
                    cmbProducts.SelectedItem = null;
                    cmbProducts.Text = "";
                    cmbProductsL1.SelectedItem = null;
                    cmbProductsL1.Text = "";
                    cmbProductsL2.SelectedItem = null;
                    cmbProductsL2.Text = "";
                }
                cmbCategory.DataBind();
                cmbProducts.DataBind();
                divEditCreate.Visible = false;
                divGrid.Visible = false;
                btnNew.Visible = false;
                GridProductOptionL3.DataBind();
            }
        }
        catch (Exception eX) { }
    }

    protected void CheckSubsubOptionL2Exists()
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM SubsubOptionL2 WHERE SubsubOptionID=@SubsubOptionID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("SubsubOptionID", cmbProductsL1.SelectedItem.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    divGrid.Visible = true;
                    btnNew.Visible = true;
                }
                else
                {
                    divGrid.Visible = false;
                    btnNew.Visible = false;
                }
                cmbProductsL2.DataBind();
            }
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
                SQLContainer.Query = "SELECT OptionID,[Option] FROM Options WHERE ScopeID=@ScopeID ORDER BY [Option] ASC";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                if (Convert.ToString(cmbScopes.SelectedItem.Value) == "-1")
                {
                    ReloadControl();
                }
                else
                {
                    cmbCategory.DataSource = ds.Tables[0];
                    cmbCategory.DataBind();
                    cmbCategory.SelectedIndex = 0;
                    cmbCategory_SelectedIndexChanged(sender, e);
                    GridProductOptionL3.DataBind();
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void cmbCategory_SelectedIndexChanged(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT SubOptionID,[SubOption] FROM SubOptions WHERE OptionID=@OptionID ORDER BY [SubOption] ASC";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("OptionID", cmbCategory.SelectedItem.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                if (Convert.ToString(cmbScopes.SelectedItem.Value) == "-1")
                {
                    ReloadControl();
                }
                else
                {
                    cmbProducts.DataSource = ds.Tables[0];
                    cmbProducts.DataBind();
                    cmbProducts.SelectedIndex = 0;
                    cmbProducts_SelectedIndexChanged(sender, e);
                    GridProductOptionL3.DataBind();
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void cmbProducts_SelectedIndexChanged(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT SubSubOptionID,[SubsubOption] FROM SubsubOptions WHERE SubOptionID=@SubOptionID  ORDER BY [SubsubOption] ASC";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("SubOptionID", cmbProducts.SelectedItem.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                cmbProductsL1.DataSource = ds.Tables[0];
                cmbProductsL1.DataBind();
                cmbProductsL1.SelectedIndex = 0;
                cmbProductsL2.DataBind();
                cmbProductsL1_SelectedIndexChanged(sender, e);
                GridProductOptionL3.DataBind();
            }
        }
        catch (Exception eX) { }
    }

    protected void cmbProductsL1_SelectedIndexChanged(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT SubsubOptionL2ID,SubsubOptionL2 FROM SubsubOptionL2 WHERE SubsubOptionID=@SubsubOptionID  ORDER BY [SubsubOptionL2] ASC";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("SubsubOptionID", cmbProductsL1.SelectedItem.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    divGrid.Visible = true;
                    btnNew.Visible = true;
                }
                else
                {
                    divGrid.Visible = false;
                    btnNew.Visible = false;
                }
                cmbProductsL2.DataSource = ds.Tables[0];
                cmbProductsL2.DataBind();
                cmbProductsL2.SelectedIndex = 0;
            }
        }
        catch (Exception eX) { }
    }

    protected void cmbProductsL2_SelectedIndexChanged(object sender, EventArgs e)
    {
        try
        {
            GridProductOptionL3.DataBind();
        }
        catch (Exception eX) { }
    }

    protected void btnNew_Click(object sender, EventArgs e)
    {
        try
        {
            divGrid.Visible = false;
            divEditCreate.Visible = true;
            hdnSubSubOptionL3ID.Value = "-1";
            btnNew.Visible = false;
            DivtopItems.Visible = false;
            fileSubSubOptionL3Image.ImageUrl = string.Empty;
        }
        catch (Exception eX) { }
    }

    protected void btnEdit_Click(object sender, EventArgs e)
    {
        try
        {
            LinkButton btn = (LinkButton)sender;
            hdnSubSubOptionL3ID.Value = btn.CommandArgument;
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM SubSubOptionL3 WHERE SubSubOptionL3ID = @SubSubOptionL3ID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("SubSubOptionL3ID", hdnSubSubOptionL3ID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                divGrid.Visible = false;
                divEditCreate.Visible = true;
                btnNew.Visible = false;
                DivtopItems.Visible = false;
                txtSubSubOptionL3.Text = Convert.ToString(ds.Tables[0].Rows[0]["SubsubOptionL3"]);
                fileSubSubOptionL3Image.ImageUrl = Convert.ToString(ds.Tables[0].Rows[0]["ImageUrl"]);
                cmbIsHidden.SelectedIndex = cmbIsHidden.Items.IndexOf(cmbIsHidden.Items.FindByValue(Convert.ToString(ds.Tables[0].Rows[0]["IsHidden"])));
            }
        }
        catch (Exception eX) { }
    }

    protected void btnSave_Click(object sender, EventArgs e)
    {
        try
        {
            string ImageName = string.Empty;
            string ImageFileName = string.Empty;
            string ImageFileID = "";
            if (Session["File"] != null)
            {
                string ErrorIfAny = String.Empty;
                Dictionary<string, string> files = new Dictionary<string, string>();
                files = ((Dictionary<string, string>)Session["File"]);
                if (files.ContainsKey("SubSubOptionL3Image"))
                {
                    String NewFilePath = String.Empty;
                    string filePath = files["SubSubOptionL3Image"];
                    string BucketName = ConfigurationManager.AppSettings["S3BucketName"];
                    string FolderName = "project-hnm/SubSubOptionL3/";
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
            if (hdnSubSubOptionL3ID.Value == "-1")
            {
                string err = "";
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "AddSubSubOptionL3 @SubsubOptionL3, @SubsubOptionL2ID, @IsHidden, @ImageUrl";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("SubsubOptionL3", txtSubSubOptionL3.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("SubsubOptionL2ID", cmbProductsL2.SelectedItem.Value));
                    SqlParameters.Add(new SqlParameter("IsHidden", cmbIsHidden.SelectedItem.Value));
                    if (Convert.ToString(ImageFileName) == "" || Convert.ToString(ImageFileName) == null)
                    {
                        SqlParameters.Add(new SqlParameter("ImageUrl", ""));
                    }
                    else
                    {
                        SqlParameters.Add(new SqlParameter("ImageUrl", ImageFileName.ToString()));
                    }
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    string SSerr = "";
                    DataSet SSds = new DataSet("ds");
                    List<Tools.SqlContainer> SSSQLCommands = new List<Tools.SqlContainer>();
                    {
                        Tools.SqlContainer SSSQLContainer = new Tools.SqlContainer();
                        SSSQLContainer.Query = "INSERT INTO ServiceRate(SubSubOptionL3ID,CreatedON,UOM)VALUES(@SubsubOptionL3ID,@Date,0)";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("SubsubOptionL3ID", ds.Tables[0].Rows[0]["SubsubOptionL3ID"]));
                        SqlParameters.Add(new SqlParameter("Date", DateTime.Now));
                        SSSQLContainer.SqlParameters = SqlParameters;
                        SSSQLCommands.Add(SSSQLContainer);
                    }
                    if (Tools.GetData(SSSQLCommands, out SSds, out SSerr))
                    {
                        divGrid.Visible = true;
                        divEditCreate.Visible = false;
                        btnNew.Visible = true;
                        DivtopItems.Visible = true;
                        GridProductOptionL3.DataBind();
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
                        SQLContainer.Query = "UPDATE SubSubOptionL3 SET SubsubOptionL3=@SubsubOptionL3,SubsubOptionL2ID=@SubsubOptionL2ID,IsHidden=@IsHidden WHERE SubSubOptionL3ID = @SubSubOptionL3ID";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("SubsubOptionL3", txtSubSubOptionL3.Text.Trim()));
                        SqlParameters.Add(new SqlParameter("SubsubOptionL2ID", cmbProductsL2.SelectedItem.Value));
                        SqlParameters.Add(new SqlParameter("IsHidden", cmbIsHidden.SelectedItem.Value));
                        SqlParameters.Add(new SqlParameter("SubSubOptionL3ID", hdnSubSubOptionL3ID.Value));
                        SQLContainer.SqlParameters = SqlParameters;
                        SQLCommands.Add(SQLContainer);
                    }
                    else
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "UPDATE SubSubOptionL3 SET SubsubOptionL3=@SubsubOptionL3,SubsubOptionL2ID=@SubsubOptionL2ID,IsHidden=@IsHidden,ImageUrl=@ImageUrl WHERE SubSubOptionL3ID = @SubSubOptionL3ID";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("SubsubOptionL3", txtSubSubOptionL3.Text.Trim()));
                        SqlParameters.Add(new SqlParameter("SubsubOptionL2ID", cmbProductsL2.SelectedItem.Value));
                        SqlParameters.Add(new SqlParameter("IsHidden", cmbIsHidden.SelectedItem.Value));
                        SqlParameters.Add(new SqlParameter("ImageUrl", ImageFileName.ToString()));
                        SqlParameters.Add(new SqlParameter("SubSubOptionL3ID", hdnSubSubOptionL3ID.Value));
                        SQLContainer.SqlParameters = SqlParameters;
                        SQLCommands.Add(SQLContainer);
                    }
                }
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    divGrid.Visible = true;
                    divEditCreate.Visible = false;
                    btnNew.Visible = true;
                    DivtopItems.Visible = true;
                    GridProductOptionL3.DataBind();
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void btnCancel_Click(object sender, EventArgs e)
    {
        try
        {
            divGrid.Visible = true;
            divEditCreate.Visible = false;
            btnNew.Visible = true;
            DivtopItems.Visible = true;
        }
        catch (Exception eX) { }
    }

    protected void btnRemove_Click(object sender, EventArgs e)
    {
        try
        {
            LinkButton btn = (LinkButton)sender;
            hdnSubSubOptionL3ID.Value = btn.CommandArgument;
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT IsHidden FROM SubsubOptionL3 WHERE SubsubOptionL3ID=@SubsubOptionL3ID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("SubsubOptionL3ID", hdnSubSubOptionL3ID.Value));
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
                SQLContainer.Query = "UPDATE SubsubOptionL3 SET IsHidden = @IsHidden WHERE SubsubOptionL3ID=@SubsubOptionL3ID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                if (hdnIsHidden.Value == "0")
                {
                    SqlParameters.Add(new SqlParameter("IsHidden", "1"));
                }
                else
                {
                    SqlParameters.Add(new SqlParameter("IsHidden", "0"));
                }
                SqlParameters.Add(new SqlParameter("SubsubOptionL3ID", hdnSubSubOptionL3ID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                PopDelete.ShowOnPageLoad = false;
                GridProductOptionL3.DataBind();
            }
        }
        catch (Exception eX) { }
    }

    protected void BtnRemoveCancel_Click(object sender, EventArgs e)
    {
        try
        {
            PopDelete.ShowOnPageLoad = false;
            GridProductOptionL3.DataBind();
        }
        catch (Exception eX) { }
    }
}