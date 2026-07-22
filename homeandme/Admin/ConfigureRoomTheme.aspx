<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="ConfigureRoomTheme.aspx.cs" Inherits="Admin_ConfigureRoomTheme" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Admin/Controls/AdminControls/AccountMenu.ascx" TagPrefix="dx" TagName="AccountMenu" %>
<%@ Register Assembly="DevExpress.Web.ASPxTreeList.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a"
    Namespace="DevExpress.Web.ASPxTreeList" TagPrefix="dx" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <asp:UpdatePanel runat="server" ID="up">
        <ContentTemplate>
            <div class="top-bar">
                <div class="breadcrumb mr-auto hidden sm:flex">
                    <a href="AdminDashboard.aspx" class="">Home</a>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right breadcrumb__icon">
                        <polyline points="9 18 15 12 9 6"></polyline></svg>
                    <a href="ManageRoomSettings.aspx" class="breadcrumb--active">Rooms</a>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right breadcrumb__icon">
                        <polyline points="9 18 15 12 9 6"></polyline></svg>
                    <a href="ManageThemeSettings.aspx" class="breadcrumb--active">Themes</a>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right breadcrumb__icon">
                        <polyline points="9 18 15 12 9 6"></polyline></svg>
                    <a href="#" class="breadcrumb--active">Configure Themes</a>
                </div>
                <div class="relative mr-3 sm:mr-6">
                    <div class="search hidden sm:block">
                    </div>
                </div>
                <dx:AccountMenu runat="server" ID="AccountMenu" />
            </div>
            <div class="grid grid-cols-12 gap-6 mt-5">
                <div class="col-span-12 lg:col-span-12">
                    <div class="box">
                        <div class="flex flex-col sm:flex-row items-center p-5 border-b border-gray-200">
                            <h2 class="font-medium text-base mr-auto">Theme Configuration
                            </h2>
                            <div class="w-full sm:w-auto flex items-center sm:ml-auto mt-3 sm:mt-0">
                            </div>
                        </div>
                        <div class="p-5 flex flex-col sm:flex-row">
                            <div class="mangThemeConfig">
                                <label>Work Type:</label>
                                <dx:ASPxComboBox ID="cmbScopes" runat="server" AutoPostBack="true" CssClass="dateList" TextField="Scope" ValueField="ScopeID"
                                    ValueType="System.String" SelectedIndex="0" OnSelectedIndexChanged="cmbScopes_SelectedIndexChanged" NullText="SELECT">
                                </dx:ASPxComboBox>
                            </div>
                            <div id="DivOptions" runat="server" visible="false" class="mangThemeConfig">
                                <label>Product Category:</label>
                                <dx:ASPxComboBox ID="cmbOptions" runat="server" CssClass="dateList" TextField="Option" ValueField="OptionID"
                                    ValueType="System.String" OnSelectedIndexChanged="cmbOptions_SelectedIndexChanged" AutoPostBack="true">
                                </dx:ASPxComboBox>
                            </div>
                        </div>
                        <div class="preview dropDowndxeOuter p-5" id="divThemeGrid" runat="server" visible="false">
                            <div class="mt-3 dropDowndxe">
                                <dx:ASPxGridView ID="GridThemeOptions" runat="server" ClientInstanceName="GridThemeOptions" Width="100%" EnableCallBacks="false"
                                    EnableTheming="false" KeyFieldName="SubsubOptionL3ID" DataSourceID="ThemeOptionSource" Styles-AlternatingRow-Enabled="True">
                                    <Columns>
                                        <dx:GridViewCommandColumn ShowSelectCheckbox="true" VisibleIndex="0" Width="30">
                                        </dx:GridViewCommandColumn>
                                        <dx:GridViewDataTextColumn FieldName="OptionLevel" VisibleIndex="1" Caption="Available Types">
                                            <Settings AutoFilterCondition="Contains" />
                                        </dx:GridViewDataTextColumn>
                                        <dx:GridViewDataTextColumn FieldName="SubsubOptionL3ID" VisibleIndex="2" Caption="" Visible="false">
                                        </dx:GridViewDataTextColumn>
                                    </Columns>
                                    <SettingsBehavior AllowMultiSelection="true" />
                                    <Settings ShowFilterRow="true" />
                                    <SettingsPager PageSize="10" />
                                </dx:ASPxGridView>
                                <asp:SqlDataSource ID="ThemeOptionSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                    SelectCommand="GetSubOptionListingByOptionsForThemes @ScopeID, @OptionID, @RoomID, @ThemeID">
                                    <SelectParameters>
                                        <asp:SessionParameter Name="ScopeID" SessionField="ScopeID" />
                                        <asp:SessionParameter Name="OptionID" SessionField="OptionID" />
                                        <asp:SessionParameter Name="RoomID" SessionField="RoomID" />
                                        <asp:SessionParameter Name="ThemeID" SessionField="ThemeID" />
                                    </SelectParameters>
                                </asp:SqlDataSource>
                            </div>
                            <div class="mt-3 dropDowndxeButArea">
                                <asp:Button ID="btnAssign" runat="server" Text="Assign" Class="button bg-theme-1 text-white mt-5 w-24" OnClick="btnAssign_Click" />
                            </div>
                            <div class="mt-3 dropDowndxe">
                                <asp:Panel ID="pnlTree" runat="server">
                                    <dx:ASPxGridView ID="GridAssignedThemeOptions" runat="server" ClientInstanceName="GridAssignedThemeOptions" Width="100%" EnableCallBacks="false"
                                        EnableTheming="false" KeyFieldName="ThemeConfigureID" DataSourceID="AssignedThemeOptionSource" Styles-AlternatingRow-Enabled="True">
                                        <Columns>
                                            <dx:GridViewDataTextColumn FieldName="ThemeConfigureID" ReadOnly="True" VisibleIndex="0" Visible="false">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataButtonEditColumn VisibleIndex="1" CellStyle-HorizontalAlign="Center"
                                                CellStyle-VerticalAlign="Middle" Caption="Is Default">
                                                <DataItemTemplate>
                                                    <dx:ASPxCheckBox ID="chkSetDefault" Checked='<%# Convert.ToBoolean(Eval("IsDefault")) %>' runat="server"
                                                        ToolTip='<% #Bind("ThemeConfigureID")%>' AutoPostBack="true" OnCheckedChanged="chkSetDefault_CheckedChanged">
                                                    </dx:ASPxCheckBox>
                                                </DataItemTemplate>
                                            </dx:GridViewDataButtonEditColumn>
                                            <dx:GridViewDataTextColumn FieldName="OptionLevel" ReadOnly="True" VisibleIndex="2" Caption="Selected Types"
                                                HeaderStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn VisibleIndex="3" CellStyle-HorizontalAlign="Left" Caption="#">
                                                <DataItemTemplate>
                                                    <asp:LinkButton ID="btnRemove" runat="server" CommandArgument='<% #Bind("ThemeConfigureID")%>' OnClick="btnRemove_Click" Text="Remove" Font-Underline="true" />
                                                </DataItemTemplate>
                                            </dx:GridViewDataTextColumn>
                                        </Columns>
                                        <SettingsPager PageSize="10" />
                                    </dx:ASPxGridView>
                                    <asp:SqlDataSource ID="AssignedThemeOptionSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                        SelectCommand="GetThemeConfigurationsListing @RoomID, @ScopeID, @ThemeID, @OptionID">
                                        <SelectParameters>
                                            <asp:SessionParameter Name="RoomID" SessionField="RoomID" />
                                            <asp:SessionParameter Name="ScopeID" SessionField="ScopeID" />
                                            <asp:SessionParameter Name="ThemeID" SessionField="ThemeID" />
                                            <asp:SessionParameter Name="OptionID" SessionField="OptionID" />
                                        </SelectParameters>
                                    </asp:SqlDataSource>
                                </asp:Panel>
                            </div>
                        </div>
                        <asp:Label ID="lblMsg" runat="server" Font-Size="Small" ForeColor="Red" Style="margin-left: 20px" />
                    </div>
                </div>
            </div>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

