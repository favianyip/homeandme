<%@ Control Language="C#" AutoEventWireup="true" CodeFile="ProductCategorySettings.ascx.cs" Inherits="Admin_Controls_AdminControls_ProductCategorySettings" %>
<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>

<%@ Register Src="~/Admin/Controls/AdminControls/ProductSettings.ascx" TagPrefix="uc1" TagName="ProductSettings" %>
<%@ Register Src="~/Admin/Controls/AdminControls/ProductSubOptionSettings.ascx" TagPrefix="uc1" TagName="ProductSubOptionSettings" %>
<%@ Register Src="~/Admin/Controls/AdminControls/ProductSubOptionLevel2.ascx" TagPrefix="uc1" TagName="ProductSubOptionLevel2" %>
<%@ Register Src="~/Admin/Controls/AdminControls/ProductSubOptionLevel3.ascx" TagPrefix="uc1" TagName="ProductSubOptionLevel3" %>
<%@ Register Src="~/Admin/Controls/AdminControls/FileUploader.ascx" TagPrefix="uc1" TagName="FileUploader" %>


<script type="text/javascript">
    function popMsg(s, e) {
        var mainDiv = document.getElementById(s.name + '_PW-1');
        mainDiv.style.width = '30%';
        mainDiv.style.width = '30%';
        s.SetWidth(mainDiv.clientWidth);
        s.UpdatePosition();
    }
</script>

<div class="flex flex-col sm:flex-row items-center p-5 delearWapper" id="DivtopItems" runat="server">
    <div class="delearOuter dropDowndxe">
        <div class="productOpt">
            <asp:Label ID="lblWorkTypeText" runat="server" Text="Work Type:"></asp:Label> 
            <dx:aspxcombobox id="cmbScopes" runat="server" autopostback="true" cssclass="dateList" datasourceid="dsScopes" textfield="Scope" valuefield="ScopeID" valuetype="System.String" selectedindex="0" onselectedindexchanged="cmbScopes_SelectedIndexChanged">
            </dx:aspxcombobox>
            <asp:SqlDataSource ID="dsScopes" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                SelectCommand="SELECT '-1' ScopeID, '...SELECT...' Scope  UNION SELECT ScopeID,Scope FROM Scopes ORDER BY Scope ASC"></asp:SqlDataSource>
            <asp:HiddenField ID="hdnScope" runat="server" />
        </div>
        <div class="productOptAddNew">
            <asp:Button ID="btnNewOption" runat="server" CssClass="button bg-theme-1 text-white " Text="Add New" OnClick="btnNewOption_Click" Visible="false" />
        </div>
    </div>
</div>
<div class="flex flex-col p-5">
    <div id="divGrid" runat="server" visible="false">
        <div>
            <asp:Label ID="lblError" runat="server" Text="Please select Scope" ForeColor="Red" Visible="false"></asp:Label>
        </div>
        <div>
            <dx:aspxgridview id="GridCategory" runat="server" clientinstancename="GridCategory" width="100%" autogeneratecolumns="False" keyfieldname="OptionID"
                enablerowscache="false" enablecallbacks="false" datasourceid="OptionSource" styles-alternatingrow-enabled="True">
                <settingsadaptivity adaptivitymode="HideDataCells" allowonlyoneadaptivedetailexpanded="false"></settingsadaptivity>
                <columns>
                    <dx:gridviewdatatextcolumn fieldname="Option" readonly="True" headerstyle-font-bold="true" visibleindex="1" caption="Product Category" cellstyle-horizontalalign="Left">
                    </dx:gridviewdatatextcolumn>
                    <dx:gridviewdataimagecolumn caption="Image" fieldname="ImageUrl" headerstyle-font-bold="true" propertiesimage-imagewidth="50" propertiesimage-imageheight="50" readonly="True" visibleindex="2">
                    </dx:gridviewdataimagecolumn>
                    <dx:gridviewdatatextcolumn fieldname="IsHidden" readonly="True" headerstyle-font-bold="true" visibleindex="3" caption="Is Hidden" cellstyle-horizontalalign="Left">
                    </dx:gridviewdatatextcolumn>
                    <dx:gridviewdatatextcolumn fieldname="SystemAddOn" readonly="True" headerstyle-font-bold="true" visibleindex="4" caption="SystemAddOn" cellstyle-horizontalalign="Left">
                    </dx:gridviewdatatextcolumn>
                    <dx:gridviewdatacolumn fieldname="ScopeID" width="200px" caption="#" headerstyle-font-bold="true" adaptivepriority="0" visibleindex="5">
                        <dataitemtemplate>
                            <div class="dropdown relative">
                                <div class="dropdown-toggle button inline-block bg-theme-1 text-white">Options</div>
                                <div class="dropdown-box mt-10 absolute w-40 top-0 left-0 z-20">
                                    <div class="dropdown-box__content box p-2">
                                        <asp:LinkButton ID="btnEdit" runat="server" Text="Edit" OnClick="btnEdit_Click" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" CommandArgument='<% #Bind("OptionID")%>' />
                                        <asp:LinkButton ID="btnRemove" runat="server" Text='<% #Bind("StatusText")%>' OnClick="btnRemove_Click" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" CommandArgument='<% #Bind("OptionID")%>' /></span>
                                    </div>
                                </div>
                            </div>
                        </dataitemtemplate>
                        <settings allowheaderfilter="False" allowautofilter="False" />
                    </dx:gridviewdatacolumn>
                </columns>
            </dx:aspxgridview>
            <asp:SqlDataSource ID="OptionSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                SelectCommand="get_OptionDetailsByScope" SelectCommandType="StoredProcedure">
                <SelectParameters>
                    <asp:ControlParameter ControlID="cmbScopes" Name="ScopeID" />
                </SelectParameters>
            </asp:SqlDataSource>
            <asp:HiddenField ID="hdnIsHidden" runat="server" />
            <div class="mb-16"></div>
        </div>
    </div>
    <div id="divEditCreate" runat="server" visible="false">
        <div class="dropDowndxeOuter">
            <div class="mt-3 dropDowndxe">
                <div>
                    <label>Product Category:*</label>
                    <asp:TextBox ID="txtOption" runat="server" CssClass="input w-full border mt-2" MaxLength="250" Width="100%" />
                    <asp:RequiredFieldValidator ID="RequiredFieldValidator3" runat="server" ErrorMessage="Enter the Option"
                        ControlToValidate="txtOption" ValidationGroup="Page" ForeColor="Red" Display="Dynamic"
                        Font-Size="X-Small" SetFocusOnError="true"></asp:RequiredFieldValidator>
                </div>
                <div class="mt-8">
                    <label>Is Hidden:*</label>
                    <dx:aspxcombobox id="cmbIsHidden" runat="server" cssclass="dateList" valuetype="System.String" selectedindex="0" width="100%">
                        <items>
                            <dx:listedititem text="No" value="0" />
                            <dx:listedititem text="Yes" value="1" />
                        </items>
                    </dx:aspxcombobox>
                </div>
                <div class="mt-8">
                    <label>System Add On:*</label>
                    <dx:aspxcombobox id="cmbSystemAddOn" runat="server" cssclass="dateList" valuetype="System.String" selectedindex="0" width="100%">
                        <items>
                            <dx:listedititem text="No" value="0" />
                            <dx:listedititem text="Yes" value="1" />
                        </items>
                    </dx:aspxcombobox>
                </div>
            </div>
            <div class="mt-3 dropDowndxe">
                <div style="display: flex;">
                    <label>Current Image : </label>
                    <asp:Image runat="server" ID="OptionImage" AlternateText="No image available" Width="150px" Height="150px" Style="margin-left: 35px;" />
                </div>
                <div class="mt-8" style="display: flex;">
                    <div>
                        <p>
                            <label>Image</label>
                        </p>
                        <label>(jpeg/jpg/png  < 500 KB, 300px X 300px)</label>
                    </div>
                    <div style="margin-right: 7px;">
                        <label>:</label>
                    </div>
                    <uc1:fileuploader runat="server" id="FileUploader" filekey="OptionImage" hgt="300" wid="300" />
                </div>
            </div>
        </div>
        <div class="mt-3">
            <asp:HiddenField ID="hdnOptionID" runat="server" />
            <asp:Button ID="btnSave" runat="server" CssClass="button bg-theme-1 text-white mt-5 w-24" OnClick="btnSave_Click" Text="Save"
                ValidationGroup="Page" CausesValidation="true" />
            <asp:Button ID="btnCancel" runat="server" CssClass="button w-24 ml-2 mb-2 bg-gray-200 text-gray-600" OnClick="btnCancel_Click" Text="Cancel"
                ValidationGroup="Page" CausesValidation="false" />
        </div>
    </div>
</div>
<dx:aspxpopupcontrol id="PopDelete" runat="server" closeaction="CloseButton" closeonescape="true" width="300px"
    popuphorizontalalign="WindowCenter" popupverticalalign="WindowCenter" clientinstancename="pcLogin" headertext="">
    <clientsideevents popup="popMsg" shown="function(s){setTimeout(function() {s.UpdatePosition();}, 0);}" />
    <contentcollection>
        <dx:popupcontrolcontentcontrol runat="server">
            <br />
            <asp:Literal ID="litAlert" runat="server" />
            <br />
            <br />
            <asp:Button ID="BtnDelete" runat="server" Text="Confirm" OnClick="BtnDelete_Click" CssClass="button bg-theme-1 text-white mt-5 w-24" />&nbsp;&nbsp;&nbsp;&nbsp;
                    <asp:Button ID="BtnRemoveCancel" runat="server" Text="Cancel" OnClick="BtnRemoveCancel_Click" CssClass="button w-24 ml-2 mb-2 bg-gray-200 text-gray-600" />

        </dx:popupcontrolcontentcontrol>
    </contentcollection>
    <contentstyle>
        <paddings padding="15px" />
    </contentstyle>
</dx:aspxpopupcontrol>
