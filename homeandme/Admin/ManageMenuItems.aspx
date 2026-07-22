<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="ManageMenuItems.aspx.cs" Inherits="Admin_ManageMenuItems" %>

<%@ Register Assembly="DevExpress.Web.ASPxTreeList.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a"
    Namespace="DevExpress.Web.ASPxTreeList" TagPrefix="dx" %>
<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Admin/Controls/AdminControls/AccountMenu.ascx" TagPrefix="uc1" TagName="AccountMenu" %>


<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager runat="server"></asp:ToolkitScriptManager>
    <asp:UpdatePanel runat="server" UpdateMode="Always">
        <ContentTemplate>
            <div class="top-bar">
                <div class="breadcrumb mr-auto hidden sm:flex">
                    <a href="AdminDashboard.aspx" class="">Home</a>
                    <i data-feather="chevron-right" class="breadcrumb__icon"></i>
                    <a href="#" class="breadcrumb--active">Menu Management</a>
                </div>
                <div class="relative mr-3 sm:mr-6">
                    <div class="search hidden sm:block">
                    </div>
                </div>
                <uc1:AccountMenu runat="server" ID="AccountMenu" />
            </div>
            <div class="grid grid-cols-12 gap-6 mt-5">
                <div class="col-span-12 lg:col-span-12">
                    <div class="box">
                        <div class="flex flex-col sm:flex-row items-center p-5 border-b border-gray-200">
                            <h2 class="font-medium text-base mr-auto">Menu Management
                            </h2>
                        </div>
                        <div class="p-5">
                            <div class="preview">
                                <div class="overflow-x-auto">
                                    <asp:Panel ID="pnlTree" runat="server">
                                        <dx:ASPxTreeList ID="treeList" runat="server" AutoGenerateColumns="false" Width="100%"
                                            KeyFieldName="MenuID" DataSourceID="SqlDataSource4"
                                            OnCommandColumnButtonInitialize="treeList_CommandColumnButtonInitialize"
                                            SettingsBehavior-AutoExpandAllNodes="false" ParentFieldName="ParentID" SettingsBehavior-AllowFocusedNode="true">
                                            <SettingsSelection Enabled="false" Recursive="false" />
                                            <Settings GridLines="Both" ShowRoot="true" />
                                            <SettingsEditing Mode="EditFormAndDisplayNode" />
                                            <SettingsPopupEditForm Width="500" />
                                            <Columns>
                                                <dx:TreeListTextColumn FieldName="MenuName">
                                                    <EditFormSettings VisibleIndex="0" />
                                                </dx:TreeListTextColumn>
                                                <dx:TreeListTextColumn FieldName="Url" Visible="false" PropertiesTextEdit-EncodeHtml="true">
                                                    <EditFormSettings VisibleIndex="1" Visible="True" ColumnSpan="2" />
                                                </dx:TreeListTextColumn>
                                                <dx:TreeListTextColumn FieldName="Description" Visible="false">
                                                    <EditFormSettings VisibleIndex="1" Visible="True" />
                                                </dx:TreeListTextColumn>
                                                <dx:TreeListCheckColumn FieldName="IsExternal" Visible="false">
                                                    <EditFormSettings VisibleIndex="5" Visible="True" />
                                                </dx:TreeListCheckColumn>
                                                <dx:TreeListTextColumn FieldName="ImagePath" Visible="false">
                                                    <EditFormSettings VisibleIndex="2" Visible="True" />
                                                </dx:TreeListTextColumn>
                                                <dx:TreeListTextColumn FieldName="MenuCode" Visible="false">
                                                    <EditFormSettings VisibleIndex="2" Visible="True" />
                                                </dx:TreeListTextColumn>
                                                <dx:TreeListTextColumn FieldName="SortOrder" Visible="false">
                                                    <EditFormSettings VisibleIndex="3" Visible="True" />
                                                </dx:TreeListTextColumn>
                                                <dx:TreeListCheckColumn FieldName="IsActive" Visible="false">
                                                    <EditFormSettings VisibleIndex="4" Visible="True" />
                                                </dx:TreeListCheckColumn>
                                                <dx:TreeListCommandColumn ShowNewButtonInHeader="true">
                                                    <EditButton Visible="true" />
                                                    <NewButton Visible="true" />
                                                    <DeleteButton Visible="true" />
                                                </dx:TreeListCommandColumn>
                                            </Columns>
                                        </dx:ASPxTreeList>
                                        <asp:SqlDataSource ID="SqlDataSource4" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                            SelectCommand="SELECT * FROM Menus WHERE IsDeleted = 0 ORDER BY SortOrder"
                                            InsertCommand="InsertHeaderMenu @ParentID, @MenuName, @Url, @Description, @IsExternal, @ImagePath, @SortOrder, @IsActive, @MenuCode"
                                            UpdateCommand="UpdateHeaderMenu @MenuName, @Url, @Description, @IsExternal, @ImagePath, @SortOrder, @IsActive, @MenuCode, @MenuID, @ParentID"
                                            DeleteCommand="UPDATE Menus SET IsDeleted = 1 WHERE MenuID=@MenuID">
                                            <InsertParameters>
                                                <asp:FormParameter Name="ParentID" DbType="String" DefaultValue="0" />
                                                <asp:FormParameter Name="MenuName" DbType="String" />
                                                <asp:FormParameter Name="Url" Type="String" />
                                                <asp:FormParameter Name="Description" DbType="String" />
                                                <asp:FormParameter Name="IsExternal" Type="Int32" />
                                                <asp:FormParameter Name="ImagePath" Type="String" />
                                                <asp:FormParameter Name="SortOrder" Type="String" />
                                                <asp:FormParameter Name="IsActive" Type="Int32" />
                                                <asp:FormParameter Name="MenuCode" Type="String" />
                                            </InsertParameters>
                                            <UpdateParameters>
                                                <asp:FormParameter ValidateInput="true" Name="MenuName" DbType="String" />
                                                <asp:FormParameter ValidateInput="true" Name="Url" Type="String" />
                                                <asp:FormParameter Name="Description" Type="String" />
                                                <asp:FormParameter Name="IsExternal" Type="Int32" />
                                                <asp:FormParameter Name="ImagePath" Type="String" />
                                                <asp:FormParameter Name="SortOrder" Type="String" />
                                                <asp:FormParameter Name="IsActive" Type="Int32" />
                                                <asp:FormParameter Name="MenuCode" Type="String" />
                                                <asp:Parameter Name="MenuID" Type="Int32" />
                                                <asp:Parameter Name="ParentID" Type="Int32" />
                                            </UpdateParameters>
                                            <DeleteParameters>
                                                <asp:Parameter Name="MenuID" Type="Int32" />
                                            </DeleteParameters>
                                        </asp:SqlDataSource>
                                    </asp:Panel>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

