<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="ManageAdminRoles.aspx.cs" Inherits="Admin_ManageAdminRoles" %>

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
                    <a href="#" class="breadcrumb--active">Role Management</a>
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
                            <h2 class="font-medium text-base mr-auto">Roles
                            </h2>
                            <div class="w-full sm:w-auto flex items-center sm:ml-auto mt-3 sm:mt-0">
                                <asp:Button ID="btnRoleCreate" runat="server" CssClass="button w-full xl:w-32 text-white bg-theme-1 xl:mr-3" Text="Create New Role" OnClick="btnRoleCreate_Click" />
                            </div>
                        </div>
                        <div id="divRoleGrid" runat="server">
                            <div class="p-5">
                                <div class="preview">
                                    <dx:ASPxGridView ID="GridRoles" runat="server" ClientInstanceName="GridRoles" Width="100%" AutoGenerateColumns="False"
                                        EnableRowsCache="false" EnableCallBacks="false" DataSourceID="RolesSource">
                                        <SettingsAdaptivity AdaptivityMode="HideDataCells" AllowOnlyOneAdaptiveDetailExpanded="true"></SettingsAdaptivity>
                                        <Columns>
                                            <dx:GridViewDataTextColumn FieldName="Role" Width="500px">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataColumn FieldName="RoleID" Width="50px" Caption="#" AdaptivePriority="0">
                                                <DataItemTemplate>
                                                    <div class="dropdown relative">
                                                        <div class="dropdown-toggle button inline-block bg-theme-1 text-white">Options</div>
                                                        <div class="dropdown-box mt-10 absolute w-40 top-0 left-0 z-20">
                                                            <div class="dropdown-box__content box p-2">
                                                                <asp:LinkButton ID="lnkEdit" runat="server" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="lnkEdit_Click" CommandArgument='<% #Bind("RoleID")%>'>Edit</asp:LinkButton>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DataItemTemplate>
                                            </dx:GridViewDataColumn>
                                        </Columns>
                                        <SettingsPager PageSize="10" NumericButtonCount="6" />
                                        <Settings ShowFilterRow="true" />
                                    </dx:ASPxGridView>
                                    <asp:SqlDataSource ID="RolesSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                        SelectCommand="SELECT * FROM Roles"></asp:SqlDataSource>
                                </div>
                            </div>
                        </div>
                        <div id="divRoleForm" runat="server" visible="false">
                            <div class="p-5" id="vertical-form">
                                <div class="preview">
                                    <div>
                                        <label>Role</label>
                                        <asp:TextBox runat="server" ID="txtRole" CssClass="input w-full border mt-2"></asp:TextBox>
                                        <asp:RequiredFieldValidator ID="reqRole" runat="server" ControlToValidate="txtRole" SetFocusOnError="true" ForeColor="Red" ErrorMessage="*" ValidationGroup="Roles"></asp:RequiredFieldValidator>
                                    </div>
                                    <asp:Button ID="btnSaveRole" runat="server" class="button bg-theme-1 text-white mt-5 w-24" Text="SAVE" ValidationGroup="Roles" OnClick="btnSaveRole_Click"></asp:Button>
                                    <asp:Button ID="btnCancel" runat="server" class="button w-24 ml-2 mb-2 bg-gray-200 text-gray-600" Text="CANCEL" CausesValidation="false" OnClick="btnCancel_Click"></asp:Button>
                                </div>
                            </div>
                        </div>
                        <div id="divMenu" runat="server" visible="false">
                            <div class="p-5">
                                <div class="preview">
                                    <dx:ASPxGridView ID="GridPermission" runat="server" ClientInstanceName="GridPermission" Width="100%" AutoGenerateColumns="False"
                                        DataSourceID="DataMenuSource">
                                        <SettingsAdaptivity AdaptivityMode="HideDataCells" AllowOnlyOneAdaptiveDetailExpanded="true"></SettingsAdaptivity>
                                        <Columns>
                                            <dx:GridViewDataTextColumn FieldName="MenuName" Caption="Menu" Width="100px">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataButtonEditColumn FieldName="Viewable" VisibleIndex="3" Width="5%" CellStyle-HorizontalAlign="Center"
                                                CellStyle-VerticalAlign="Middle" Caption="Viewable">
                                                <DataItemTemplate>
                                                    <dx:ASPxCheckBox ID="Viewable" Checked='<%# Convert.ToBoolean( Eval("Viewable")) %>' runat="server" CommandArgument='<%# Eval("MenuID")%>' AutoPostBack="true" OnCheckedChanged="Viewable_CheckedChanged"></dx:ASPxCheckBox>
                                                </DataItemTemplate>
                                            </dx:GridViewDataButtonEditColumn>
                                        </Columns>
                                        <SettingsPager PageSize="10" NumericButtonCount="6" />
                                        <Settings ShowFilterRow="true" />
                                    </dx:ASPxGridView>
                                    <asp:SqlDataSource ID="DataMenuSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                        SelectCommand="GetMenuItemPermissionData" SelectCommandType="StoredProcedure">
                                        <SelectParameters>
                                            <asp:ControlParameter ControlID="hdnRoleID" Name="RoleID" />
                                        </SelectParameters>
                                    </asp:SqlDataSource>
                                    <asp:HiddenField ID="hdnRoleID" runat="server" />
                                </div>
                                <asp:Button ID="btnGoBack" runat="server" class="button bg-theme-1 text-white mt-5" Text="<< Back" ValidationGroup="Roles" OnClick="btnGoBack_Click"></asp:Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

