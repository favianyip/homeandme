using DevExpress.Utils;
using DevExpress.Web.ASPxTreeList;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin_ManageMenuItems : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {

    }

    protected void treeList_CommandColumnButtonInitialize(object sender, TreeListCommandColumnButtonEventArgs e)
    {
        try
        {
            ASPxTreeList tl = sender as ASPxTreeList;
            if (e.NodeKey != null)
            {
                TreeListNode node = tl.FindNodeByKeyValue(e.NodeKey);
                if (node.Level == 1)
                {
                }
                else if (node.Level == 2)
                {
                    if (e.ButtonType == TreeListCommandColumnButtonType.New)
                    {
                        e.Visible = DefaultBoolean.False;
                    }
                }
                else
                {
                    if (e.ButtonType == TreeListCommandColumnButtonType.New)
                    {
                        e.Visible = DefaultBoolean.True;
                    }
                }
            }
        }
        catch (Exception eX) { }
    }
}