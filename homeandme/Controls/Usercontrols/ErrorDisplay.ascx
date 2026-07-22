<%@ Control Language="C#" AutoEventWireup="true" CodeFile="ErrorDisplay.ascx.cs" Inherits="Controls_Usercontrols_ErrorDisplay" %>
<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>

<script type="text/javascript">
    function popMsg(s, e) {
        var mainDiv = document.getElementById(s.name + '_PW-1');
        mainDiv.style.width = '300px';
        s.SetWidth(mainDiv.clientWidth);
        s.UpdatePosition();
    }
</script>
<dx:ASPxPopupControl ID="pcAlert" runat="server" CloseAction="CloseButton" CloseOnEscape="true" Width="300px"
    PopupHorizontalAlign="WindowCenter" PopupVerticalAlign="WindowCenter" ClientInstanceName="pcLogin" HeaderText="">
    <ClientSideEvents PopUp="popMsg" Shown="function(s){setTimeout(function() {s.UpdatePosition();}, 0);}" />
    <ContentCollection>
        <dx:PopupControlContentControl runat="server">
            <asp:Literal ID="litAlert" runat="server" />
        </dx:PopupControlContentControl>
    </ContentCollection>
    <ContentStyle>
        <Paddings Padding="15px" />
    </ContentStyle>
</dx:ASPxPopupControl>
