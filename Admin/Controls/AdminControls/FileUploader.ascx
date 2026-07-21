<%@ Control Language="C#" AutoEventWireup="true" CodeFile="FileUploader.ascx.cs" Inherits="Controls_Admincontrols_FileUploader" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a"
    Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Src="~/Admin/Controls/AdminControls/ImageCrop.ascx" TagPrefix="uc1" TagName="ImageCrop" %>
<asp:Literal ID="lit" runat="server" />
<div class="cropWidth img-crop">
    <dx:ASPxPopupControl ID="popConfirm" runat="server" EnableHierarchyRecreation="false" ClientInstanceName="popConfirm" CssClass="popupTop" CloseAction="None" ShowCloseButton="false" Width="500px" OnWindowCallback="popConfirm_WindowCallback"
        PopupHorizontalAlign="WindowCenter" PopupVerticalAlign="Middle" HeaderText="Crop Image" Modal="true">
        <ContentCollection>
            <dx:PopupControlContentControl runat="server">
                <asp:Literal ID="litCrop" runat="server" />
            </dx:PopupControlContentControl>
        </ContentCollection>
    </dx:ASPxPopupControl>
</div>
