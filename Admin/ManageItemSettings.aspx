<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="ManageItemSettings.aspx.cs" Inherits="Admin_ManageItemSettings" %>

<%@ Register Assembly="DevExpress.Web.ASPxTreeList.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a"
    Namespace="DevExpress.Web.ASPxTreeList" TagPrefix="dx" %>
<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Assembly="CKEditor.NET" Namespace="CKEditor.NET" TagPrefix="CKEditor" %>
<%@ Register Src="~/Admin/Controls/Usercontrols/ErrorDisplay.ascx" TagPrefix="uc1" TagName="ErrorDisplay" %>
<%@ Register Src="~/Admin/Controls/AdminControls/WorkType.ascx" TagPrefix="PageControl" TagName="WorkType" %>
<%@ Register Src="~/Admin/Controls/AdminControls/ProductCategorySettings.ascx" TagPrefix="PageControl" TagName="ProductCategorySettings" %>
<%@ Register Src="~/Admin/Controls/AdminControls/ProductSettings.ascx" TagPrefix="PageControl" TagName="ProductSettings" %>
<%@ Register Src="~/Admin/Controls/AdminControls/ProductSubOptionSettings.ascx" TagPrefix="PageControl" TagName="ProductSubOptionSettings" %>
<%@ Register Src="~/Admin/Controls/AdminControls/AccountMenu.ascx" TagPrefix="PageControl" TagName="AccountMenu" %>
<%@ Register Src="~/Admin/Controls/AdminControls/ProductSubOptionLevel2.ascx" TagPrefix="PageControl" TagName="ProductSubOptionLevel2" %>
<%@ Register Src="~/Admin/Controls/AdminControls/ProductSubOptionLevel3.ascx" TagPrefix="PageControl" TagName="ProductSubOptionLevel3" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager runat="server"></asp:ToolkitScriptManager>
    <div class="top-bar">
        <div class="breadcrumb mr-auto hidden sm:flex">
            <a href="AdminDashboard.aspx" class="">Home</a>
            <i data-feather="chevron-right" class="breadcrumb__icon"></i>
            <a href="#" class="breadcrumb--active">Items Management</a>
        </div>
        <div class="relative mr-3 sm:mr-6">
            <div class="search hidden sm:block">
            </div>
        </div>
        <pagecontrol:accountmenu runat="server" id="AccountMenu" />
    </div>
    <div class="grid grid-cols-12 gap-6 mt-5">
        <div class="col-span-12 lg:col-span-12">
            <div class="box">
                <div class="flex flex-col sm:flex-row items-center p-5 border-b border-gray-200">
                    <h2 class="font-medium text-base mr-auto">Items
                    </h2>
                </div>
                <div id="divUserGrid" runat="server">
                    <div class="p-5">
                        <div class="preview">
                            <dx:aspxpagecontrol id="ASPxPageControl1" runat="server" width="100%" ontabclick="ASPxPageControl1_TabClick" enabletabscrolling="true">
                                <tabpages>
                                    <dx:tabpage name="Worktype" text="Work Type">
                                        <contentcollection>
                                            <dx:contentcontrol style="background-color: #f3f3f4 !important">
                                                <pagecontrol:worktype runat="server" id="WorkType" />
                                            </dx:contentcontrol>
                                        </contentcollection>
                                    </dx:tabpage>
                                    <dx:tabpage name="ProductCategory" text="Product Category">
                                        <contentcollection>
                                            <dx:contentcontrol>
                                                <pagecontrol:productcategorysettings runat="server" id="ProductCategorySettings" />
                                            </dx:contentcontrol>
                                        </contentcollection>
                                    </dx:tabpage>
                                    <dx:tabpage name="Products" text="Products">
                                        <contentcollection>
                                            <dx:contentcontrol>
                                                <pagecontrol:productsettings runat="server" id="ProductSettings" />
                                            </dx:contentcontrol>
                                        </contentcollection>
                                    </dx:tabpage>
                                    <dx:tabpage name="ProductOptions1" text="Product Options 1">
                                        <contentcollection>
                                            <dx:contentcontrol>
                                                <pagecontrol:productsuboptionsettings runat="server" id="ProductSubOptionSettings" />
                                            </dx:contentcontrol>
                                        </contentcollection>
                                    </dx:tabpage>
                                    <dx:tabpage name="ProductOptions2" text="Product Options 2">
                                        <contentcollection>
                                            <dx:contentcontrol>
                                                <pagecontrol:productsuboptionlevel2 runat="server" id="ProductSubOptionLevel2" />
                                            </dx:contentcontrol>
                                        </contentcollection>
                                    </dx:tabpage>
                                    <dx:tabpage name="ProductOptions3" text="Product Options 3">
                                        <contentcollection>
                                            <dx:contentcontrol>
                                                <pagecontrol:productsuboptionlevel3 runat="server" id="ProductSubOptionLevel3" />
                                            </dx:contentcontrol>
                                        </contentcollection>
                                    </dx:tabpage>
                                </tabpages>
                            </dx:aspxpagecontrol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</asp:Content>

