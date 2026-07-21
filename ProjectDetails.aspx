<%@ Page Title="" Language="C#" MasterPageFile="~/DashboardMasterPage.master" AutoEventWireup="true" CodeFile="ProjectDetails.aspx.cs" Inherits="ProjectDetails" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <asp:UpdatePanel runat="server">
        <ContentTemplate>
            <div class="hnm-head-with-total">
                <h2 class="hnm-sub-head">Project Details</h2>
                <div class="hnm-total-box" id="divTotal" runat="server" visible="false">
                    <div class="hnm-total-box__txt">TOTAL</div>
                    <div class="hnm-total-box__amount">$<asp:Label ID="lblTotalAmount" runat="server"></asp:Label></div>
                </div>
            </div>
            <div class="hnm-dashboard__costing">
                <div class="hnm-dashboard__costing-sec1">
                    <div class="hnm-total-box__txt">Status</div>
                    <div class="hnm-total-box__amount">
                        <asp:Label ID="lblStatusText" runat="server"></asp:Label>
                    </div>
                </div>
                <div class="hnm-dashboard__costing-sec1 hnm-dashboard__costing-sec1--mob">
                    <asp:LinkButton ID="lnkCosting" runat="server" CssClass="hnm-button hnm-button--secondary" OnClick="lnkCosting_Click" Visible="false">COSTING</asp:LinkButton>
                    <asp:LinkButton ID="lnkCostingBySubCon" runat="server" CssClass="hnm-button" OnClick="lnkCostingBySubCon_Click" Visible="false">COSTING BY SUBCON</asp:LinkButton>
                </div>
            </div>
            <div class="hnm-project-detail">
                <div class="hnm-project-detail__box" id="DivRoomDetails" runat="server">
                    <div class="hnm-project-detail__head">
                        <div class="hnm-project-detail__col-1">Room Details</div>
                    </div>
                    <asp:Repeater runat="server" ID="rptRoomDetails">
                        <ItemTemplate>
                            <div class="hnm-project-detail__row">
                                <div class="hnm-project-detail__col-1">
                                    <h3 class="hnm-project-detail__item-head"><%# Eval("RoomName") %></h3>
                                    <span class="hnm-project-detail__cost">$<%# Eval("RoomCost") %>
                                    </span>
                                    <asp:Label ID="lblRoomPreferenceID" runat="server" Text='<%# Eval("RoomPreferenceID") %>' Visible="false"></asp:Label>
                                </div>
                                <div id="divWithWholeApartment" runat="server" visible='<%# Convert.ToBoolean(Convert.ToInt32(Eval("WholeApartmentVisible"))) %>' width="100%">
                                    <dx:aspxgridview id="GridWholeApartmentRoomScopes" runat="server" clientinstancename="GridWholeApartmentRoomScopes" width="100%" keyfieldname="ScopeID"
                                        enablecallbacks="false" datasourceid="dsWholeApartmentRoomScopes" cssclass="table-fontsize">
                                        <settingsadaptivity adaptivitymode="Off" allowonlyoneadaptivedetailexpanded="true"></settingsadaptivity>
                                        <columns>
                                            <dx:gridviewdatatextcolumn fieldname="ScopeID" visibleindex="1" cellstyle-horizontalalign="Center" visible="false">
                                            </dx:gridviewdatatextcolumn>
                                            <dx:gridviewdatatextcolumn fieldname="ItemName" visibleindex="2" editformsettings-visible="False" caption="Tasks" width="760px">
                                            </dx:gridviewdatatextcolumn>
                                            <dx:gridviewdatatextcolumn fieldname="ScopeCost" visibleindex="3" editformsettings-visible="False" caption="Cost" width="300px">
                                            </dx:gridviewdatatextcolumn>
                                        </columns>
                                    </dx:aspxgridview>
                                    <asp:SqlDataSource ID="dsWholeApartmentRoomScopes" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                        SelectCommand="GetAllScopesForWholeApartments @RoomPreferenceID">
                                        <SelectParameters>
                                            <asp:ControlParameter ControlID="lblRoomPreferenceID" Name="RoomPreferenceID" />
                                        </SelectParameters>
                                    </asp:SqlDataSource>
                                </div>
                                <div id="divWithOutWholeApartment" runat="server" visible='<%# !Convert.ToBoolean(Convert.ToInt32(Eval("WholeApartmentVisible"))) %>'>
                                    <dx:aspxgridview id="GridRoomScopes" runat="server" clientinstancename="GridRoomScopes" width="100%" keyfieldname="ScopeID"
                                        enablecallbacks="false" datasourceid="RoomScopesSource" ondetailrowexpandedchanged="GridRoomScopes_DetailRowExpandedChanged"
                                        onbeforeperformdataselect="GridRoomScopes_BeforePerformDataSelect" onpageindexchanged="GridRoomScopes_PageIndexChanged" cssclass="table-fontsize">
                                        <settingsadaptivity adaptivitymode="Off" allowonlyoneadaptivedetailexpanded="true"></settingsadaptivity>
                                        <columns>
                                            <dx:gridviewdatatextcolumn fieldname="ScopeID" visibleindex="1" cellstyle-horizontalalign="Center" visible="false">
                                            </dx:gridviewdatatextcolumn>
                                            <dx:gridviewdatatextcolumn fieldname="Scope" visibleindex="2" editformsettings-visible="False" caption="Tasks" width="760px">
                                            </dx:gridviewdatatextcolumn>
                                            <dx:gridviewdatatextcolumn fieldname="ScopeCost" visibleindex="3" editformsettings-visible="False" caption="Cost" width="400px">
                                            </dx:gridviewdatatextcolumn>
                                        </columns>
                                        <templates>
                                            <detailrow>
                                                <dx:aspxgridview id="GridRoomOptions" runat="server" clientinstancename="GridRoomOptions" width="100%" enablecallbacks="false"
                                                    settingstext-emptydatarow="No orders have been made yet" datasourceid="RoomOptionSource" keyfieldname="Scopes_in_ProjectRoomID"
                                                    onbeforeperformdataselect="GridRoomOptions_BeforePerformDataSelect" cssclass="table-fontsize small">
                                                    <clientsideevents init="function(s, e) { s.SetVisible(s.GetVisibleRowsOnPage() != 0);  }" />
                                                    <settingsadaptivity adaptivitymode="HideDataCellsWindowLimit"></settingsadaptivity>
                                                    <columns>
                                                        <dx:gridviewbandcolumn caption="Products" headerstyle-font-bold="true">
                                                            <columns>
                                                                <dx:gridviewdatatextcolumn fieldname="Items" visibleindex="1" editformsettings-visible="False" propertiestextedit-encodehtml="false">
                                                                </dx:gridviewdatatextcolumn>
                                                                <dx:gridviewdatatextcolumn fieldname="Length" visibleindex="2" editformsettings-visible="False">
                                                                </dx:gridviewdatatextcolumn>
                                                                <dx:gridviewdatatextcolumn fieldname="Width" visibleindex="3" editformsettings-visible="False">
                                                                </dx:gridviewdatatextcolumn>
                                                                <dx:gridviewdatatextcolumn fieldname="Quantity" visibleindex="4" editformsettings-visible="False">
                                                                </dx:gridviewdatatextcolumn>
                                                                <dx:gridviewdatatextcolumn fieldname="Area" visibleindex="5" editformsettings-visible="False">
                                                                </dx:gridviewdatatextcolumn>
                                                                <dx:gridviewdatatextcolumn fieldname="Cost" visibleindex="6" editformsettings-visible="False">
                                                                </dx:gridviewdatatextcolumn>
                                                            </columns>
                                                        </dx:gridviewbandcolumn>
                                                    </columns>
                                                    <settings showfooter="True" />
                                                </dx:aspxgridview>
                                            </detailrow>
                                        </templates>
                                        <settingsdetail showdetailrow="true" allowonlyonemasterrowexpanded="true" />
                                        <settings showfilterrow="false" />
                                    </dx:aspxgridview>
                                    <asp:SqlDataSource ID="RoomScopesSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                        SelectCommand="GetAllScopesForPreferredRooms @RoomPreferenceID">
                                        <SelectParameters>
                                            <asp:ControlParameter ControlID="lblRoomPreferenceID" Name="RoomPreferenceID" />
                                        </SelectParameters>
                                    </asp:SqlDataSource>
                                    <asp:SqlDataSource ID="RoomOptionSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                        SelectCommand="GetAllOptionLevelsForPreferredRooms @RoomPreferenceID, @ScopeID">
                                        <SelectParameters>
                                            <asp:ControlParameter ControlID="lblRoomPreferenceID" Name="RoomPreferenceID" />
                                            <asp:SessionParameter SessionField="ScopeID" Name="ScopeID" Type="Int32" />
                                        </SelectParameters>
                                    </asp:SqlDataSource>
                                </div>
                            </div>
                        </ItemTemplate>
                    </asp:Repeater>
                </div>
                <div class="hnm-project-detail__box" id="DivSubconDetails" runat="server" visible="false">
                    <div class="hnm-project-detail__head">
                        <div class="hnm-project-detail__col-1">Subcon Details</div>
                    </div>
                    <asp:Repeater runat="server" ID="rptSubconDetails">
                        <ItemTemplate>
                            <div class="hnm-project-detail__row">
                                <div class="hnm-project-detail__col-1">
                                    <h3 class="hnm-project-detail__item-head"><%# Eval("PartnerName") %></h3>
                                    <span class="hnm-project-detail__cost">$<%# Eval("RoomCostByPartner") %>
                                    </span>
                                    <asp:Label ID="lblPartnerID" runat="server" Text='<%# Eval("PartnerID") %>' Visible="false"></asp:Label>
                                </div>
                                <dx:aspxgridview id="GridSubconScopes" runat="server" clientinstancename="GridSubconScopes" width="100%" keyfieldname="ScopeID"
                                    enablecallbacks="false" datasourceid="SubconScopesSource" cssclass="table-fontsize">
                                    <settingsadaptivity adaptivitymode="Off" allowonlyoneadaptivedetailexpanded="true"></settingsadaptivity>
                                    <columns>
                                        <dx:gridviewdatatextcolumn fieldname="ScopeID" visibleindex="1" cellstyle-horizontalalign="Center" visible="false">
                                        </dx:gridviewdatatextcolumn>
                                        <dx:gridviewdatatextcolumn fieldname="Scope" visibleindex="2" editformsettings-visible="False" caption="Tasks" width="50%">
                                        </dx:gridviewdatatextcolumn>
                                        <dx:gridviewdatatextcolumn fieldname="ScopeCost" visibleindex="3" editformsettings-visible="False" caption="Cost">
                                        </dx:gridviewdatatextcolumn>
                                    </columns>
                                    <settings showfilterrow="false" />
                                </dx:aspxgridview>
                                <asp:SqlDataSource ID="SubconScopesSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                    SelectCommand="GetAllScopesByProjectForSubcon @PartnerID, @ProjectID">
                                    <SelectParameters>
                                        <asp:ControlParameter ControlID="lblPartnerID" Name="PartnerID" />
                                        <asp:SessionParameter SessionField="ProjectID" Name="ProjectID" Type="Int32" />
                                    </SelectParameters>
                                </asp:SqlDataSource>
                            </div>
                        </ItemTemplate>
                    </asp:Repeater>
                </div>
                <div class="hnm-amout-box">
                    <h3 class="hnm-amout-box__text">Renovation Cost : </h3>
                    <div class="hnm-amout-box__cost">$<asp:Label ID="lblRenovationCost" runat="server"></asp:Label></div>
                </div>
                <asp:Repeater ID="rptProjectFees" runat="server">
                    <ItemTemplate>
                        <div class="hnm-amout-box">
                            <h3 class="hnm-amout-box__text"><%# Eval("FeeText") %></h3>
                            <div class="hnm-amout-box__cost">$<%# Tools.FormatMoneyWithDecimal(Convert.ToString(Eval("Amount"))) %></div>
                        </div>
                    </ItemTemplate>
                </asp:Repeater>
                <div class="hnm-amout-box" id="divOverAll" runat="server">
                    <h3 class="hnm-amout-box__text">Total overall project cost : </h3>
                    <div class="hnm-amout-box__cost">$<asp:Label ID="lblTotalProjectCost" runat="server"></asp:Label></div>
                </div>
                <div class="hnm-amout-box" id="divFinalAdjustmentCost" runat="server" visible="false">
                    <h3 class="hnm-amout-box__text">Final Adjustments cost : </h3>
                    <div class="hnm-amout-box__cost">
                        <asp:Label ID="lblFinalAdjustmentCost" runat="server"></asp:Label>
                    </div>
                </div>
                <div class="hnm-amout-box" id="divProjectCost" runat="server" visible="false">
                    <h3 class="hnm-amout-box__text">Overall  project cost : </h3>
                    <div class="hnm-amout-box__cost">$<asp:Label ID="lblOverallProjectCost" runat="server"></asp:Label></div>
                </div>
            </div>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

